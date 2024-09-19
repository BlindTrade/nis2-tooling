import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import '../../style/Overview.css';

const OverviewPage = () => {
  const location = useLocation();
  const assets = location.state?.assets || {};
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [vulnerabilities, setVulnerabilities] = useState({});
  const [showFilterPopup, setShowFilterPopup] = useState(false); 
  const [selectedSeverity, setSelectedSeverity] = useState('');

  const toggleDropdown = async (assetId) => {
    const isOpen = openDropdowns[assetId];   

    if (!isOpen) {
      try {
        const response = await fetch(`http://localhost:8081/vulnerabilities/${assetId}`);
        const data = await response.json();
        setVulnerabilities((prevState) => ({
          ...prevState,
          [assetId]: data,
        }));
      } catch (error) {
        console.error('Error fetching vulnerabilities:', error);
      }
    }

    // Toggle Dropdown
    setOpenDropdowns((prevState) => ({
      ...prevState,
      [assetId]: !isOpen,
    }));
  };

  const fetchVulnerabilities = async (assetId) => {
    try {
      const response = await fetch(`http://localhost:8081/vulnerabilities/${assetId}`);
      const data = await response.json();

      const severityCount = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };
  
      data.forEach((vuln) => {
        if (vuln.vuln_severity === 'LOW') {
            severityCount.low += 1;  
        } else if (vuln.vuln_severity === 'MEDIUM') {
            severityCount.medium += 1;  
        } else if (vuln.vuln_severity === 'HIGH') {
          severityCount.high += 1;  
        } else if (vuln.vuln_severity === 'CRITICAL') {
            severityCount.critical += 1;  
        }
      });

      console.log(`Asset ID: ${assetId}, Severity Count:`, severityCount);
  
      return severityCount;
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
      return { low: 0, medium: 0, high: 0, critical: 0 };
    }
  };
  
  useEffect(() => {
    const fetchData = async () => {
      const allVulnerabilities = {
        endpointDevices: { low: 0, medium: 0, high: 0, critical: 0 },
        servers: { low: 0, medium: 0, high: 0, critical: 0 },
        software: { low: 0, medium: 0, high: 0, critical: 0 },
        otherAssets: { low: 0, medium: 0, high: 0, critical: 0 },
      };
  
      const assetGroups = ['endpointDevices', 'servers', 'software', 'otherAssets'];
      for (let group of assetGroups) {
        if (assets[group]) {
          for (let asset of assets[group]) {
            const vulnCount = await fetchVulnerabilities(asset.asset_id);
            
            allVulnerabilities[group].low += vulnCount.low;  
            allVulnerabilities[group].medium += vulnCount.medium;  
            allVulnerabilities[group].high += vulnCount.high;  
            allVulnerabilities[group].critical += vulnCount.critical;  
          }
        }
      }
  
      console.log("All Vulnerabilities Data (Total by severity):", allVulnerabilities);
      setVulnerabilities(allVulnerabilities);  
    };
  
    fetchData();
  }, [assets]);
  
  

  const generateDonutData = (category) => ({
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        data: [
          vulnerabilities[category]?.critical || 0,
          vulnerabilities[category]?.high || 0,
          vulnerabilities[category]?.medium || 0,
          vulnerabilities[category]?.low || 0,
        ],
        backgroundColor: ['#850101', '#FF0000', '#FFA500', '#008000']
      },
    ],
  });

  const handleFilterClick = () => {
    setShowFilterPopup(true); 
  };

  const handleClosePopup = () => {
    setShowFilterPopup(false); 
  };

  const handleSeverityChange = (event) => {
    setSelectedSeverity(event.target.value);
  };


  return (
    <div className="overview-page">
        <h1 className="title">Report</h1>

        {/* graphical visualization */}
        <section className="graph-section">
            <h2>Overview</h2>
            <div className="graphs">
            <div>
                <h2>Endpoint Devices</h2>
                <Doughnut data={generateDonutData('endpointDevices')} />
            </div>
            <div>
                <h2>Servers</h2>
                <Doughnut data={generateDonutData('servers')} />
            </div>
            <div>
                <h2>Software</h2>
                <Doughnut data={generateDonutData('software')} />
            </div>
            <div>
                <h2>Other Devices</h2>
                <Doughnut data={generateDonutData('otherAssets')} />
            </div>
            </div>
        </section>

        {/* Popup Filter */}
        {showFilterPopup && (
            <div className="popup-overlay">
            <div className="popup">
                <label htmlFor="severity">Severity:</label>
                <select id="severity" value={selectedSeverity} onChange={handleSeverityChange}>
                <option value="">Select Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                </select>
                <button onClick={handleClosePopup}>Close</button>
            </div>
            </div>
        )}

        <section className="devices-transition">
            <hr />
            <h2 className='devices_titel'> List of IT-Assets</h2>
        </section>
        
      {/* Endpoint Devices */}
      <section className="section-endpoints">
        <div className="endpoint-devices">
          <h3>Endpoint Devices</h3>
          <ul>
            {assets.endpointDevices.map((asset) => (
              <li key={asset.asset_id}>
                {asset.name} (ID: {asset.asset_id})
                <button onClick={() => toggleDropdown(asset.asset_id)}>
                  {openDropdowns[asset.asset_id] ? 'Hide CVEs' : 'Show CVEs'}
                </button>
                {openDropdowns[asset.asset_id] && (
                  <ul className="cve-list">
                    {vulnerabilities[asset.asset_id]?.length > 0 ? (
                      vulnerabilities[asset.asset_id].map((vuln, index) => (
                        <li key={index}>
                          <strong>{vuln.cve_id}</strong>: {vuln.vuln_description}
                          <ul>
                            <li><strong>Base Score:</strong> {vuln.vuln_base_score || 'N/A'}</li>
                            <li><strong>Severity:</strong> {vuln.vuln_severity || 'N/A'}</li>
                            <li><strong>Exploitability Score:</strong> {vuln.vuln_exploitability_score || 'N/A'}</li>
                            <li><strong>Impact Score:</strong> {vuln.vuln_impact_score || 'N/A'}</li>
                          </ul>
                          <hr /> 
                        </li>
                      ))
                    ) : (
                      <li>No vulnerabilities found.</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Servers */}
      <section className="section-server">
        <div className="servers">
          <h3>Servers</h3>
          <ul>
            {assets.servers.map((asset) => (
              <li key={asset.asset_id}>
                {asset.name} (ID: {asset.asset_id})
                <button onClick={() => toggleDropdown(asset.asset_id)}>
                  {openDropdowns[asset.asset_id] ? 'Hide CVEs' : 'Show CVEs'}
                </button>
                {openDropdowns[asset.asset_id] && (
                  <ul className="cve-list">
                    {vulnerabilities[asset.asset_id]?.length > 0 ? (
                      vulnerabilities[asset.asset_id].map((vuln, index) => (
                        <li key={index}>
                          <strong>{vuln.cve_id}</strong>: {vuln.vuln_description}
                          <ul>
                            <li><strong>Base Score:</strong> {vuln.vuln_base_score || 'N/A'}</li>
                            <li><strong>Severity:</strong> {vuln.vuln_severity || 'N/A'}</li>
                            <li><strong>Exploitability Score:</strong> {vuln.vuln_exploitability_score || 'N/A'}</li>
                            <li><strong>Impact Score:</strong> {vuln.vuln_impact_score || 'N/A'}</li>
                          </ul>
                          <hr /> 
                        </li>
                      ))
                    ) : (
                      <li>No vulnerabilities found.</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Software */}
      <section className="section-software">
        <div className="software">
          <h3>Software</h3>
          <ul>
            {assets.software.map((asset) => (
              <li key={asset.asset_id}>
                {asset.name} (ID: {asset.asset_id})
                <button onClick={() => toggleDropdown(asset.asset_id)}>
                  {openDropdowns[asset.asset_id] ? 'Hide CVEs' : 'Show CVEs'}
                </button>
                {openDropdowns[asset.asset_id] && (
                  <ul className="cve-list">
                    {vulnerabilities[asset.asset_id]?.length > 0 ? (
                      vulnerabilities[asset.asset_id].map((vuln, index) => (
                        <li key={index}>
                          <strong>{vuln.cve_id}</strong>: {vuln.vuln_description}
                          <ul>
                            <li><strong>Base Score:</strong> {vuln.vuln_base_score || 'N/A'}</li>
                            <li><strong>Severity:</strong> {vuln.vuln_severity || 'N/A'}</li>
                            <li><strong>Exploitability Score:</strong> {vuln.vuln_exploitability_score || 'N/A'}</li>
                            <li><strong>Impact Score:</strong> {vuln.vuln_impact_score || 'N/A'}</li>
                          </ul>
                          <hr /> 
                        </li>
                      ))
                    ) : (
                      <li>No vulnerabilities found.</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* anderen Geräte */}
      <section className="section-other-devices">
        <div className="other-devices">
          <h3>Other Devices</h3>
          <ul>
            {assets.otherAssets.map((asset) => (
              <li key={asset.asset_id}>
                {asset.name} (ID: {asset.asset_id})
                <button onClick={() => toggleDropdown(asset.asset_id)}>
                  {openDropdowns[asset.asset_id] ? 'Hide CVEs' : 'Show CVEs'}
                </button>
                {openDropdowns[asset.asset_id] && (
                  <ul className="cve-list">
                    {vulnerabilities[asset.asset_id]?.length > 0 ? (
                      vulnerabilities[asset.asset_id].map((vuln, index) => (
                        <li key={index}>
                          <strong>{vuln.cve_id}</strong>: {vuln.vuln_description}
                          <ul>
                            <li><strong>Base Score:</strong> {vuln.vuln_base_score || 'N/A'}</li>
                            <li><strong>Severity:</strong> {vuln.vuln_severity || 'N/A'}</li>
                            <li><strong>Exploitability Score:</strong> {vuln.vuln_exploitability_score || 'N/A'}</li>
                            <li><strong>Impact Score:</strong> {vuln.vuln_impact_score || 'N/A'}</li>
                          </ul>
                          <hr /> 
                        </li>
                      ))
                    ) : (
                      <li>No vulnerabilities found.</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default OverviewPage;
