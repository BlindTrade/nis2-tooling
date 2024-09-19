const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
// axios is used for the API call
const axios = require('axios'); 

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database Logic
const db = mysql.createConnection({
    host: "localhost",
    user: 'root',
    password: 'my-secret-pw',
    database: 'mydb'
});

// Build db connection
db.connect((err) => {
    if(err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});

// Get projects from project
app.get('/project', (req, res) => {
    const sql = "SELECT * FROM mydb.project";
    db.query(sql, (err, data) => {
        if(err) return res.json(err);
        return res.json(data);
    });
});

// Open newly created project
app.get('/assets/:projectId', (req, res) => {
    const { projectId } = req.params;
    const sql = `
        SELECT 
            a.asset_id,  -- Select asset_id
            a.asset_type,
            ed.enddevice_name AS name, ed.enddevice_os AS os, ed.enddevice_osversion AS osversion, ed.enddevice_manufacturer AS manufacturer, ed.enddevice_model AS model, ed.enddevice_cpu AS cpu, ed.enddevice_gpu AS gpu, ed.enddevice_description AS description, ed.enddevice_status AS status, ed.enddevice_owner AS owner
        FROM mydb.assets a
        INNER JOIN mydb.enddevices ed ON ed.assets_asset_id = a.asset_id
        WHERE a.project_project_id = ? AND a.asset_type = 'Endgerät'
        
        UNION ALL

        SELECT 
            a.asset_id,  -- Select asset_id
            a.asset_type,
            s.server_name AS name, s.server_os AS os, s.server_osversion AS osversion, s.server_manufacturer AS manufacturer, s.server_model AS model, s.server_cpu AS cpu, s.server_standort AS standort, s.server_description AS description, NULL AS status, NULL AS owner
        FROM mydb.assets a
        INNER JOIN mydb.servers s ON s.assets_asset_id = a.asset_id
        WHERE a.project_project_id = ? AND a.asset_type = 'Server'

        UNION ALL

        SELECT 
            a.asset_id,  -- Select asset_id
            a.asset_type,
            sw.software_name AS name, sw.software_version AS os, NULL AS osversion, sw.software_manufacturer AS manufacturer, NULL AS model, NULL AS cpu, NULL AS standort, sw.software_description AS description, sw.software_status AS status, NULL AS owner
        FROM mydb.assets a
        INNER JOIN mydb.software sw ON sw.assets_asset_id = a.asset_id
        WHERE a.project_project_id = ? AND a.asset_type = 'Software'

        UNION ALL

        SELECT 
            a.asset_id,  -- Select asset_id
            a.asset_type,
            oa.other_name AS name, oa.other_os AS os, oa.other_osversion AS osversion, oa.other_manufacturer AS manufacturer, oa.other_model AS model, NULL AS cpu, NULL AS standort, oa.other_description AS description, NULL AS status, NULL AS owner
        FROM mydb.assets a
        INNER JOIN mydb.others oa ON oa.assets_asset_id = a.asset_id
        WHERE a.project_project_id = ? AND a.asset_type = 'Andere Geräte'
    `;
    db.query(sql, [projectId, projectId, projectId, projectId], (err, data) => {
        if (err) return res.status(500).json(err);
        return res.json(data);
    });
});

// Insert project into database
app.post('/project', (req, res) => {
    const { name } = req.body;
    const created = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const lastChanged = created;

    const sql = "INSERT INTO mydb.project (project_name, project_lastchanged, project_created) VALUES (?, ?, ?)";
    db.query(sql, [name, lastChanged, created], (err, result) => {
        if(err) return res.status(500).json(err);
        return res.status(201).json({ message: "Project created", projectId: result.insertId });
    });
});

// Delete an asset from all tables in the database
app.delete('/asset/:assetId', (req, res) => {
    let { assetId } = req.params;

    assetId = parseInt(assetId, 10);

    if (isNaN(assetId)) {
        return res.status(400).json({ error: 'Invalid asset ID' });
    }

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: 'Transaction error', details: err });

        // Find asset type
        const findAssetTypeQuery = `
            SELECT asset_type FROM assets WHERE asset_id = ?
        `;

        db.query(findAssetTypeQuery, [assetId], (err, result) => {
            if (err || result.length === 0) {
                return db.rollback(() => {
                    res.status(500).json({ error: 'Failed to find asset type or asset does not exist', details: err });
                });
            }

            const assetType = result[0].asset_type;
            let deleteFromTableQuery = '';
            let deleteValues = [assetId];

            // Which table to delete from based on asset type
            switch (assetType) {
                case 'Endgerät':
                    deleteFromTableQuery = `DELETE FROM enddevices WHERE assets_asset_id = ?`;
                    break;
                case 'Server':
                    deleteFromTableQuery = `DELETE FROM servers WHERE assets_asset_id = ?`;
                    break;
                case 'Software':
                    deleteFromTableQuery = `DELETE FROM software WHERE assets_asset_id = ?`;
                    break;
                case 'Andere Geräte':
                    deleteFromTableQuery = `DELETE FROM others WHERE assets_asset_id = ?`;
                    break;
                default:
                    return db.rollback(() => {
                        res.status(400).json({ error: 'Unknown asset type' });
                    });
            }

            // Delete from the specific table
            db.query(deleteFromTableQuery, deleteValues, (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        res.status(500).json({ error: 'Failed to delete from specific asset table', details: err });
                    });
                }

                // Delete entries from vuln_mapping with the same asset_id
                const deleteVulnMapping = `DELETE FROM vuln_mapping WHERE asset_id = ?`;
                db.query(deleteVulnMapping, [assetId], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ error: 'Failed to delete from vuln_mapping table', details: err });
                        });
                    }

                    // Delete from the assets table
                    const deleteAsset = `DELETE FROM assets WHERE asset_id = ?`;
                    db.query(deleteAsset, [assetId], (err, result) => {
                        if (err) {
                            return db.rollback(() => {
                                res.status(500).json({ error: 'Failed to delete asset', details: err });
                            });
                        }

                        // Commit 
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ error: 'Failed to commit transaction', details: err });
                                });
                            }

                            return res.status(200).json({ message: 'Asset and all related records deleted successfully' });
                        });
                    });
                });
            });
        });
    });
});

// Insert asset into the correct table based on asset type and save vulnerabilities
app.post('/asset', (req, res) => {
    const { assets_asset_type, assets_project_project_id, ...assetDetails } = req.body;

    // Insert into the common `assets` table
    const sqlAssets = `
        INSERT INTO mydb.assets (asset_type, project_project_id)
        VALUES (?, ?)
    `;
    db.query(sqlAssets, [assets_asset_type, assets_project_project_id], (err, result) => {
        if (err) return res.status(500).json(err);

        const assetId = result.insertId;

        // Now insert into the specific table based on the asset type
        let sqlSpecific;
        let values;

        switch (assets_asset_type) {
            case 'Endgerät':
                sqlSpecific = `
                    INSERT INTO mydb.enddevices (assets_asset_id, assets_project_project_id, enddevice_name, enddevice_os, enddevice_osversion, enddevice_manufacturer, enddevice_model, enddevice_cpu, enddevice_gpu, enddevice_owner, enddevice_status, enddevice_description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                values = [assetId, assets_project_project_id, assetDetails.enddevice_name, assetDetails.enddevice_os, assetDetails.enddevice_osversion, assetDetails.enddevice_manufacturer, assetDetails.enddevice_model, assetDetails.enddevice_cpu, assetDetails.enddevice_gpu, assetDetails.enddevice_owner, assetDetails.enddevice_status, assetDetails.enddevice_description];
                break;

            case 'Server':
                sqlSpecific = `
                    INSERT INTO mydb.servers (assets_asset_id, assets_project_project_id, server_name, server_os, server_osversion, server_manufacturer, server_model, server_cpu, server_standort, server_description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                values = [assetId, assets_project_project_id, assetDetails.server_name, assetDetails.server_os, assetDetails.server_osversion, assetDetails.server_manufacturer, assetDetails.server_model, assetDetails.server_cpu, assetDetails.server_standort, assetDetails.server_description];
                break;

            case 'Software':
                sqlSpecific = `
                    INSERT INTO mydb.software (assets_asset_id, assets_project_project_id, software_name, software_version, software_manufacturer, software_status, software_description)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `;
                values = [assetId, assets_project_project_id, assetDetails.software_name, assetDetails.software_version, assetDetails.software_manufacturer, assetDetails.software_status, assetDetails.software_description];
                break;

            case 'Andere Geräte':
                sqlSpecific = `
                    INSERT INTO mydb.others (assets_asset_id, assets_project_project_id, other_name, other_category, other_os, other_osversion, other_manufacturer, other_model, other_description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                values = [assetId, assets_project_project_id, assetDetails.other_name, assetDetails.other_category, assetDetails.other_os, assetDetails.other_osversion, assetDetails.other_manufacturer, assetDetails.other_model, assetDetails.other_description];
                break;

            default:
                return res.status(400).json({ message: "Invalid asset type" });
        }

        db.query(sqlSpecific, values, async (err, result) => {
            if (err) return res.status(500).json(err);

            try {
                // NVD API-Abfrage für das neu erstellte Asset
                const vulnerabilities = await getVulnerabilitiesForAsset(assetId);
                console.log("Received vulnerabilities:", JSON.stringify(vulnerabilities, null, 2));

                // Wenn Vulnerabilities gefunden wurden, diese in der vuln_mapping-Tabelle speichern
                if (Array.isArray(vulnerabilities) && vulnerabilities.length > 0) {
                    const insertVulnMapping = `
                        INSERT INTO mydb.vuln_mapping 
                        (asset_id, project_id, cve_id, vuln_description, vuln_base_score, vuln_severity, vuln_exploitability_score, vuln_impact_score, vuln_configurations, vuln_last_changed) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;

                    vulnerabilities.forEach(vulnerability => {
                        const cvssMetricV31 = vulnerability.cve.metrics?.cvssMetricV31?.[0] || {};
                        const cvssMetricV2 = vulnerability.cve.metrics?.cvssMetricV2?.[0] || {};    //fallback to older version

                        const baseScore = cvssMetricV31.cvssData?.baseScore || cvssMetricV2.cvssData?.baseScore || null;
                        const baseSeverity = cvssMetricV31.cvssData?.baseSeverity || cvssMetricV2.baseSeverity || '';
                        const exploitabilityScore = cvssMetricV31.exploitabilityScore || cvssMetricV2.exploitabilityScore || null;
                        const impactScore = cvssMetricV31.impactScore || cvssMetricV2.impactScore || null;

                        // console.log("Base Score:", baseScore);  // Log the values to see if they're correctly fetched
                        // console.log("Base Severity:", baseSeverity);
                        // console.log("Exploitability Score:", exploitabilityScore);
                        // console.log("Impact Score:", impactScore);

                        const values = [
                            assetId,
                            assets_project_project_id,
                            vulnerability.cve.id,
                            vulnerability.cve.descriptions?.[0]?.value || '',  // Beschreibung
                            baseScore,
                            baseSeverity,
                            exploitabilityScore,
                            impactScore,
                            JSON.stringify(vulnerability.cve.configurations) || '',  // Konfigurationen
                            vulnerability.cve.lastModified || null  // Letzte Änderung
                        ];

                        db.query(insertVulnMapping, values, (err, result) => {
                            if (err) {
                                console.error('Failed to insert vulnerability:', err);
                                return res.status(500).json({ error: 'Failed to insert vulnerability' });
                            }
                        });
                    });
                }

                // Rückmeldung an den Client nach erfolgreicher API-Anfrage und Speicherung
                res.status(201).json({
                    message: "Asset created, NVD API request completed, vulnerabilities saved.",
                    assetId,
                    vulnerabilities
                });
            } catch (error) {
                console.error('Error fetching vulnerabilities:', error);
                res.status(500).json({ error: 'Failed to fetch vulnerabilities from NVD API' });
            }
        });
    });
});

// Get vulnerabilities for a specific asset from the vuln_mapping table
app.get('/vulnerabilities/:assetId', (req, res) => {
    const { assetId } = req.params;
    const sql = `
        SELECT cve_id, vuln_description, vuln_base_score, vuln_severity, vuln_exploitability_score, vuln_impact_score
        FROM mydb.vuln_mapping
        WHERE asset_id = ?
    `;
    db.query(sql, [assetId], (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Error fetching vulnerabilities', details: err });
        }
        return res.json(data);
    });
});
  
// NVD logic
// Get vulnerability Data from NVD API
async function getVulnerabilitiesForAsset(assetId) {
    return new Promise((resolve, reject) => {
        const apiKey = '9740c48c-3451-45d5-a03c-51510ae56d1a';

        // Query the database for the asset type based on the asset ID
        const assetTypeQuery = `
            SELECT a.asset_type, a.project_project_id 
            FROM mydb.assets a
            WHERE a.asset_id = ?
        `;
        db.query(assetTypeQuery, [assetId], async (err, assetRows) => {
            if (err) {
                console.error('Error querying database:', err);
                return reject('Database query failed');
            }

            if (assetRows.length === 0) {
                return reject('No asset found for the given asset ID');
            }

            const assetType = assetRows[0].asset_type;
            //const projectId = assetRows[0].project_project_id;

            // Handle different asset types
            try {
                let vulnerabilities = [];
                if (assetType === 'Endgerät') {
                    vulnerabilities = await handleEndgeraet(assetId, apiKey);
                } else if (assetType === 'Server') {
                    vulnerabilities = await handleServer(assetId, apiKey);
                } else if (assetType === 'Software') {
                    vulnerabilities = await handleSoftware(assetId, apiKey);
                } else if (assetType === 'Andere Geräte') {
                    vulnerabilities = await handleAndereGeraete(assetId, apiKey);
                } else {
                    return reject('Unknown asset type');
                }

                resolve(vulnerabilities);
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Handle vulnerabilities for the asset class Endgeräte
async function handleEndgeraet(assetId, apiKey) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT ed.enddevice_os, ed.enddevice_manufacturer, ed.enddevice_model, ed.enddevice_cpu, ed.enddevice_gpu
            FROM mydb.enddevices ed
            WHERE ed.assets_asset_id = ?
        `;
        db.query(sql, [assetId], async (err, rows) => {
            if (err) return reject('Database query failed');

            if (rows.length === 0) return reject('No data found for the given asset ID');

            const originalOs = rows[0].enddevice_os;
            const originalManufacturer = rows[0].enddevice_manufacturer;
            const originalModel = rows[0].enddevice_model;
            const originalCpu = rows[0].enddevice_cpu;
            const originalGpu = rows[0].enddevice_gpu;
            // console.log(rows[0]);
            // console.log(originalOs);
            // console.log(originalCpu);
            // console.log(originalGpu);
            // console.log(originalManufacturer);
            // console.log(originalModel);

            const manufacturerModel = `${originalManufacturer} ${originalModel}`;

            try {
                const nvdUrlOs = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(originalOs)}&keywordExactMatch`;
                const nvdUrlManufacturerModel = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(manufacturerModel)}&keywordExactMatch`;
                const nvdUrlCpu = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(originalCpu)}&keywordExactMatch`;
                const nvdUrlGpu = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(originalGpu)}&keywordExactMatch`;
                console.log(nvdUrlOs);
                console.log(nvdUrlManufacturerModel);
                console.log(nvdUrlCpu);
                console.log(nvdUrlGpu);

                const [responseOs, responseManufacturerModel, responseCpu, responseGpu] = await Promise.all([
                    axios.get(nvdUrlOs, { headers: { 'apiKey': apiKey } }),
                    axios.get(nvdUrlManufacturerModel, { headers: { 'apiKey': apiKey } }),
                    axios.get(nvdUrlCpu, { headers: { 'apiKey': apiKey } }),
                    axios.get(nvdUrlGpu, { headers: { 'apiKey': apiKey } })
                ]);

                const normalizedOs = originalOs.replace(/ /g, '_').toLowerCase();
                const normalizedManufacturerModel = manufacturerModel.replace(/ /g, '_').toLowerCase();
                const normalizedCpu = originalCpu.replace(/ /g, '_').toLowerCase();
                const normalizedGpu = originalGpu.replace(/ /g, '_').toLowerCase();

                const combinedVulnerabilities = [
                    ...(responseOs.data.vulnerabilities || []),
                    ...(responseManufacturerModel.data.vulnerabilities || []),
                    ...(responseCpu.data.vulnerabilities || []),
                    ...(responseGpu.data.vulnerabilities || [])
                ];

                const filteredVulnerabilities = combinedVulnerabilities.reduce((acc, vuln) => {
                    if (
                        vuln.cve.configurations &&
                        vuln.cve.configurations.some(config =>
                            config.nodes &&
                            config.nodes.some(node =>
                                node.cpeMatch &&
                                node.cpeMatch.some(match =>
                                    (match.criteria.includes(normalizedOs) || match.criteria.includes(normalizedManufacturerModel) || match.criteria.includes(normalizedCpu) || match.criteria.includes(normalizedGpu)) && match.vulnerable
                                )
                            )
                        )
                    ) {
                        if (!acc.some(existingVuln => existingVuln.cve.id === vuln.cve.id)) {
                            acc.push(vuln);
                        }
                    }
                    return acc;
                }, []);

                resolve(filteredVulnerabilities);
            } catch (apiError) {
                reject('Failed to fetch data from NVD API (enddevice)');
            }
        });
    });
}

// Handle vulnerabilities for the asset class Server
async function handleServer(assetId, apiKey) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT s.server_os, s.server_manufacturer, s.server_model, s.server_cpu
            FROM mydb.servers s
            WHERE s.assets_asset_id = ?
        `;
        db.query(sql, [assetId], async (err, rows) => {
            if (err) return reject('Database query failed');

            if (rows.length === 0) return reject('No server data found for the given asset ID');

            const serverOs = rows[0].server_os;
            const serverManufacturer = rows[0].server_manufacturer;
            const serverModel = rows[0].server_model;
            const serverCpu = rows[0].server_cpu;

            const manufacturerModel = `${serverManufacturer} ${serverModel}`;

            try {
                const nvdUrlServerOs = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(serverOs)}&keywordExactMatch`;
                const nvdUrlManufacturerModel = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(manufacturerModel)}&keywordExactMatch`;
                const nvdUrlCpu = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(serverCpu)}&keywordExactMatch`;
                console.log(nvdUrlServerOs);
                console.log(nvdUrlManufacturerModel);
                console.log(nvdUrlCpu);

                const [responseServerOs, responseManufacturerModel, responseCpu] = await Promise.all([
                    axios.get(nvdUrlServerOs, { headers: { 'apiKey': apiKey } }),
                    axios.get(nvdUrlManufacturerModel, { headers: { 'apiKey': apiKey } }),
                    axios.get(nvdUrlCpu, { headers: { 'apiKey': apiKey } })
                ]);

                const normalizedServerOs = serverOs.replace(/ /g, '_').toLowerCase();
                const normalizedManufacturerModel = manufacturerModel.replace(/ /g, '_').toLowerCase();
                const normalizedCpu = serverCpu.replace(/ /g, '_').toLowerCase();

                const combinedVulnerabilities = [
                    ...(responseServerOs.data.vulnerabilities || []),
                    ...(responseManufacturerModel.data.vulnerabilities || []),
                    ...(responseCpu.data.vulnerabilities || [])
                ];

                const filteredVulnerabilities = combinedVulnerabilities.reduce((acc, vuln) => {
                    if (
                        vuln.cve.configurations &&
                        vuln.cve.configurations.some(config =>
                            config.nodes &&
                            config.nodes.some(node =>
                                node.cpeMatch &&
                                node.cpeMatch.some(match =>
                                    (match.criteria.includes(normalizedServerOs) || match.criteria.includes(normalizedManufacturerModel) || match.criteria.includes(normalizedCpu)) && match.vulnerable
                                )
                            )
                        )
                    ) {
                        if (!acc.some(existingVuln => existingVuln.cve.id === vuln.cve.id)) {
                            acc.push(vuln);
                        }
                    }
                    return acc;
                }, []);

                resolve(filteredVulnerabilities);
            } catch (apiError) {
                reject('Failed to fetch data from NVD API (server)');
            }
        });
    });
}

// Handle vulnerabilities for the asset class Software
async function handleSoftware(assetId, apiKey) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT sw.software_name, sw.software_manufacturer
            FROM mydb.software sw
            WHERE sw.assets_asset_id = ?
        `;
        db.query(sql, [assetId], async (err, rows) => {
            if (err) return reject('Database query failed');

            if (rows.length === 0) return reject('No software data found for the given asset ID');

            const softwareName = rows[0].software_name;
            const softwareManufacturer = rows[0].software_manufacturer;

            const softwareSearchString = `${softwareManufacturer} ${softwareName}`;

            try {
                const nvdUrlSoftware = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(softwareSearchString)}&keywordExactMatch`;

                const responseSoftware = await axios.get(nvdUrlSoftware, {
                    headers: { 'apiKey': apiKey }
                });

                const normalizedSoftwareSearchString = softwareSearchString.replace(/ /g, ':').toLowerCase();

                const vulnerabilities = responseSoftware.data.vulnerabilities || [];
                const filteredVulnerabilities = vulnerabilities.reduce((acc, vuln) => {
                    if (
                        vuln.cve.configurations &&
                        vuln.cve.configurations.some(config =>
                            config.nodes &&
                            config.nodes.some(node =>
                                node.cpeMatch &&
                                node.cpeMatch.some(match =>
                                    match.criteria.includes(normalizedSoftwareSearchString) && match.vulnerable
                                )
                            )
                        )
                    ) {
                        if (!acc.some(existingVuln => existingVuln.cve.id === vuln.cve.id)) {
                            acc.push(vuln);
                        }
                    }
                    return acc;
                }, []);

                resolve(filteredVulnerabilities);
            } catch (apiError) {
                reject('Failed to fetch data from NVD API (software)');
            }
        });
    });
}

// Handle vulnerabilities for the asset class Andere Geräte
async function handleAndereGeraete(assetId, apiKey) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT oa.other_manufacturer, oa.other_model, oa.other_os
            FROM mydb.others oa
            WHERE oa.assets_asset_id = ?
        `;
        db.query(sql, [assetId], async (err, rows) => {
            if (err) return reject('Database query failed');

            if (rows.length === 0) return reject('No data found for the given asset ID');

            const otherManufacturer = rows[0].other_manufacturer;
            const otherModel = rows[0].other_model;
            const otherOs = rows[0].other_os;

            try {
                const apiRequests = [];

                if (otherManufacturer && otherModel) {
                    const manufacturerModel = `${otherManufacturer} ${otherModel}`;
                    const nvdUrlManufacturerModel = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(manufacturerModel)}&keywordExactMatch`;
                    apiRequests.push(axios.get(nvdUrlManufacturerModel, { headers: { 'apiKey': apiKey } }));
                }

                if (otherOs) {
                    const nvdUrlOs = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(otherOs)}&keywordExactMatch`;
                    apiRequests.push(axios.get(nvdUrlOs, { headers: { 'apiKey': apiKey } }));
                }

                const apiResponses = await Promise.all(apiRequests);

                let combinedVulnerabilities = [];
                for (const response of apiResponses) {
                    combinedVulnerabilities = [
                        ...combinedVulnerabilities,
                        ...(response.data.vulnerabilities || [])
                    ];
                }

                const normalizedManufacturerModel = (otherManufacturer && otherModel) 
                    ? `${otherManufacturer} ${otherModel}`.replace(/ /g, '_').toLowerCase() 
                    : null;
                const normalizedOs = otherOs ? otherOs.replace(/ /g, '_').toLowerCase() : null;

                const filteredVulnerabilities = combinedVulnerabilities.reduce((acc, vuln) => {
                    if (
                        vuln.cve.configurations &&
                        vuln.cve.configurations.some(config =>
                            config.nodes &&
                            config.nodes.some(node =>
                                node.cpeMatch &&
                                node.cpeMatch.some(match =>
                                    ((normalizedManufacturerModel && match.criteria.includes(normalizedManufacturerModel)) ||
                                     (normalizedOs && match.criteria.includes(normalizedOs))) && match.vulnerable
                                )
                            )
                        )
                    ) {
                        if (!acc.some(existingVuln => existingVuln.cve.id === vuln.cve.id)) {
                            acc.push(vuln);
                        }
                    }
                    return acc;
                }, []);

                resolve(filteredVulnerabilities);
            } catch (apiError) {
                reject('Failed to fetch data from NVD API (other devices)');
            }
        });
    });
}

app.listen(8081, () => {
    console.log("Server is listening on port 8081");
});