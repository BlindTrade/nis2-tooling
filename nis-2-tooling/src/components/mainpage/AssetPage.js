import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../style/AssetPage.css';

const AssetPage = () => {
  const { projectId } = useParams(); 
  const navigate = useNavigate();
  const [showPopup, setShowPopup] = useState(false);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [assetTypeSelection, setAssetTypeSelection] = useState(null); 
  const [editMode, setEditMode] = useState(false); 
  const [assets, setAssets] = useState({
    endpointDevices: [],
    servers: [],
    software: [],
    otherAssets: []
  });
  const [selectedAsset, setSelectedAsset] = useState(null); 
  const [asset, setAsset] = useState({
    assets_asset_type: '',
    assets_project_project_id: projectId,
    enddevice_name: '',
    enddevice_os: '',
    enddevice_osversion: '',
    enddevice_manufacturer: '',
    enddevice_model: '',
    enddevice_cpu: '',
    enddevice_gpu: '',
    enddevice_description: '',
    enddevice_owner: '',
    enddevice_status: '',
    server_name: '',
    server_os: '',
    server_osversion: '',
    server_manufacturer: '',
    server_model: '',
    server_cpu: '',
    server_standort: '',
    server_description: '',
    software_name: '',
    software_version: '',
    software_manufacturer: '',
    software_status: '',
    software_description: '',
    other_name: '',
    other_category: '',
    other_os: '',
    other_osversion: '',
    other_manufacturer: '',
    other_model: '',
    other_description: ''
  });

  const fetchAssets = async () => {
    try {
        const response = await fetch(`http://localhost:8081/assets/${projectId}`);
        const data = await response.json();

        if (Array.isArray(data)) {
            categorizeAssets(data);
        } else {
            console.error('Expected array but got:', data);
        }
    } catch (error) {
        console.error('Error fetching assets:', error);
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;

    const confirmDelete = window.confirm(`Are you sure you want to delete the asset: ${selectedAsset.name}?`);

    if (!confirmDelete) return;

    try {
        const response = await fetch(`http://localhost:8081/asset/${selectedAsset.asset_id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            alert('Asset deleted successfully');
            fetchAssets();
            setSelectedAsset(null);
        } else {
            alert('Failed to delete the asset');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete the asset');
    }
};

  useEffect(() => {
    fetchAssets(); 
  }, [projectId]);

  const categorizeAssets = (assetsData) => {
    const endpointDevices = [];
    const servers = [];
    const software = [];
    const otherAssets = [];

    assetsData.forEach(asset => {
      if (asset.asset_type === 'Endgerät') {
        endpointDevices.push(asset);
      } else if (asset.asset_type === 'Server') {
        servers.push(asset);
      } else if (asset.asset_type === 'Software') {
        software.push(asset);
      } else if (asset.asset_type === 'Andere Geräte') {
        otherAssets.push(asset);
      }
    });

    setAssets({
      endpointDevices,
      servers,
      software,
      otherAssets
    });
  };

  const handleAssetClick = (asset) => {
    setSelectedAsset(asset); 
    setAsset(asset); 
    setAssetTypeSelection(asset.asset_type); 
  };

  const handleAssetTypeChange = (e) => {
    setAssetTypeSelection(e.target.value);
    setAsset({
      ...asset,
      assets_asset_type: e.target.value,
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAsset(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleAddAsset = async () => {
    try {
      const response = await fetch('http://localhost:8081/asset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(asset),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Asset created with ID: ${data.assetId}`);
        
        // Reset the asset object to its initial state
        setAsset({
          assets_asset_type: '', // Will be set based on selection
          assets_project_project_id: projectId,
          enddevice_name: '',
          enddevice_os: '',
          enddevice_osversion: '',
          enddevice_manufacturer: '',
          enddevice_model: '',
          enddevice_cpu: '',
          enddevice_gpu: '',
          enddevice_description: '',
          enddevice_owner: '',
          enddevice_status: '',
          server_name: '',
          server_os: '',
          server_osversion: '',
          server_manufacturer: '',
          server_model: '',
          server_cpu: '',
          server_standort: '',
          server_description: '',
          software_name: '',
          software_version: '',
          software_manufacturer: '',
          software_status: '',
          software_description: '',
          other_name: '',
          other_category: '',
          other_os: '',
          other_osversion: '',
          other_manufacturer: '',
          other_model: '',
          other_description: ''
        });

        setShowPopup(false);
        fetchAssets(); 
      } else {
        alert('Failed to create asset');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create asset');
    }
  };

   // Reset the asset type selection 
  const handleBackToTypeSelection = () => {
    setAssetTypeSelection(null);
  };

  const handleSaveUpdate = async () => {
    const updatedAsset = { ...selectedAsset, ...asset };

    try {
      const response = await fetch(`http://localhost:8081/asset/${selectedAsset.asset_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedAsset), 
      });

      if (response.ok) {
        alert('Asset updated successfully');
        fetchAssets(); 
        setShowPopup(false);
        setEditMode(false); 
      } else {
        alert('Failed to update asset');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to update asset');
    }
  };

  const handleUpdateAsset = () => {
    setEditMode(true); 
    setShowUpdatePopup(true); 
  };

  const handleCheckVulnerabilities = async () => {
    if (!selectedAsset) {
      alert("Please select an asset first");
      return;
    }
  
    try {
      const response = await fetch(`http://localhost:8081/vulnerabilities/${selectedAsset.asset_id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        console.log("Vulnerabilities fetched:", data);
        alert(`Vulnerabilities found: ${data.vulnerabilities.length}`);
      } else {
        alert("Failed to fetch vulnerabilities.");
      }
    } catch (error) {
      console.error("Error fetching vulnerabilities:", error);
      alert("Error fetching vulnerabilities.");
    }
  };  

  const handleCreateReport = () => {
    // Navigate to OverviewPage and hand over the assets
    navigate(`/overview/${projectId}`, { state: { assets } }); 
  };


  return (
    <div className="asset-page">
      <div className="header">
        <h1>Unternehmensassets for Project ID: {projectId}</h1>
      </div>

      <section className="asset-overview">
        <div className="endpoint-devices">
          <h2>Endpoint Devices</h2>
          <ul>
            {assets.endpointDevices.map((asset, index) => (
              <li key={index} onClick={() => handleAssetClick(asset)} style={{ cursor: 'pointer' }}>
                {asset.name} 
              </li>
            ))}
          </ul>
        </div>
        <div className="servers">
          <h2>Servers</h2>
          <ul>
            {assets.servers.map((asset, index) => (
              <li key={index} onClick={() => handleAssetClick(asset)} style={{ cursor: 'pointer' }}>
                {asset.name} 
              </li>
            ))}
          </ul>
        </div>
        <div className="software">
          <h2>Software</h2>
          <ul>
            {assets.software.map((asset, index) => (
              <li key={index} onClick={() => handleAssetClick(asset)} style={{ cursor: 'pointer' }}>
                {asset.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="other-assets">
          <h2>Other IT-Assets</h2>
          <ul>
            {assets.otherAssets.map((asset, index) => (
              <li key={index} onClick={() => handleAssetClick(asset)} style={{ cursor: 'pointer' }}>
                {asset.name} 
              </li>
            ))}
          </ul>
        </div>

        <div className="btn-add">
          <button className="btn-add-item" onClick={() => setShowPopup(true)}>+</button>
        </div>
      </section>

      <section className="asset-information">
        {selectedAsset ? (
          <div>
            <h2>Asset Information</h2>
            <p><strong>Asset ID:</strong> {selectedAsset.asset_id}</p>
            {selectedAsset.asset_type === 'Endgerät' && (
              <>
                <p><strong>Name:</strong> {selectedAsset.name}</p>
                <p><strong>OS:</strong> {selectedAsset.os}</p>
                <p><strong>Version:</strong> {selectedAsset.osversion}</p>
                <p><strong>Manufacturer:</strong> {selectedAsset.manufacturer}</p>
                <p><strong>Model:</strong> {selectedAsset.model}</p>
                <p><strong>CPU:</strong> {selectedAsset.cpu}</p>
                <p><strong>GPU:</strong> {selectedAsset.gpu}</p>
                <p><strong>Status:</strong> {selectedAsset.status}</p>
                <p><strong>Description:</strong> {selectedAsset.description}</p>
                <p><strong>Owner:</strong> {selectedAsset.owner}</p>
              </>
            )}
            {selectedAsset.asset_type === 'Server' && (
              <>
                <p><strong>Name:</strong> {selectedAsset.name}</p>
                <p><strong>OS:</strong> {selectedAsset.os}</p>
                <p><strong>Version:</strong> {selectedAsset.software_version}</p>
                <p><strong>Manufacturer:</strong> {selectedAsset.manufacturer}</p>
                <p><strong>Model:</strong> {selectedAsset.model}</p>
                <p><strong>CPU:</strong> {selectedAsset.cpu}</p>
                <p><strong>Location:</strong> {selectedAsset.standort}</p>
                <p><strong>Description:</strong> {selectedAsset.description}</p>
              </>
            )}
            {selectedAsset.asset_type === 'Software' && (
              <>
                <p><strong>Name:</strong> {selectedAsset.name}</p>
                <p><strong>Version:</strong> {selectedAsset.os}</p>
                <p><strong>Manufacturer:</strong> {selectedAsset.manufacturer}</p>
                <p><strong>Status:</strong> {selectedAsset.status}</p>
                <p><strong>Description:</strong> {selectedAsset.description}</p>
              </>
            )}
            {selectedAsset.asset_type === 'Andere Geräte' && (
              <>
                <p><strong>Name:</strong> {selectedAsset.name}</p>
                <p><strong>Category:</strong> {selectedAsset.category}</p>
                <p><strong>OS:</strong> {selectedAsset.os}</p>
                <p><strong>Version:</strong> {selectedAsset.osversion}</p>
                <p><strong>Manufacturer:</strong> {selectedAsset.manufacturer}</p>
                <p><strong>Model:</strong> {selectedAsset.model}</p>
                <p><strong>Description:</strong> {selectedAsset.description}</p>
              </>
            )}
            <div className="btn-edit-row">
              <button className="btn-update-info" onClick={handleUpdateAsset}>Update Information</button>
              <button className="btn-update-vuln" onClick={handleCheckVulnerabilities}>Check Vulnerabilities</button>
              <button className="btn-delete-asset" onClick={handleDeleteAsset}>Delete Asset</button>
            </div>
          </div>
        ) : (
          <p>Please select an asset to view its details</p>
        )}
      </section>

      <div className="btn-report">
        <button className="btn-create-report" onClick={handleCreateReport}>Create Report</button>
      </div>
      
      {/* Popup for creating a new asset */}
      {showPopup && (
        <div className="popup">
          <div className="popup-inner">
            {!assetTypeSelection ? (
              <>
                <h2>Select Asset Type</h2>
                <select onChange={handleAssetTypeChange}>
                  <option value="">Select Type</option>
                  <option value="Server">Server</option>
                  <option value="Software">Software</option>
                  <option value="Andere Geräte">Other IT-Assets</option>
                  <option value="Endgerät">Endpoint Device</option>
                </select>
                <button onClick={() => setShowPopup(false)}>Cancel</button>
              </>
            ) : (
              <>
                <h2>Add New {assetTypeSelection}</h2>
                
                {/* Endpoint Device Form */}
                {assetTypeSelection === 'Endgerät' && (
                  <>
                    <label>
                      Name:
                      <input type="text" name="enddevice_name" value={asset.enddevice_name} onChange={handleInputChange} />
                    </label>
                    <label>
                      OS:
                      <input type="text" name="enddevice_os" value={asset.enddevice_os} onChange={handleInputChange} />
                    </label>
                    <label>
                      OS Version:
                      <input type="text" name="enddevice_osversion" value={asset.enddevice_osversion} onChange={handleInputChange} />
                    </label>
                    <label>
                      Manufacturer:
                      <input type="text" name="enddevice_manufacturer" value={asset.enddevice_manufacturer} onChange={handleInputChange} />
                    </label>
                    <label>
                      Model:
                      <input type="text" name="enddevice_model" value={asset.enddevice_model} onChange={handleInputChange} />
                    </label>
                    <label>
                      CPU:
                      <input type="text" name="enddevice_cpu" value={asset.enddevice_cpu} onChange={handleInputChange} />
                    </label>
                    <label>
                      GPU:
                      <input type="text" name="enddevice_gpu" value={asset.enddevice_gpu} onChange={handleInputChange} />
                    </label>
                    <label>
                      Owner:
                      <input type="text" name="enddevice_owner" value={asset.enddevice_owner} onChange={handleInputChange} />
                    </label>
                    <label>
                      Status:
                      <input type="text" name="enddevice_status" value={asset.enddevice_status} onChange={handleInputChange} />
                    </label>
                    <label>
                      Description:
                      <input type="text" name="enddevice_description" value={asset.enddevice_description} onChange={handleInputChange} />
                    </label>
                  </>
                )}

                {/* Server Form */}
                {assetTypeSelection === 'Server' && (
                  <>
                    <label>
                      Name:
                      <input type="text" name="server_name" value={asset.server_name} onChange={handleInputChange} />
                    </label>
                    <label>
                      OS:
                      <input type="text" name="server_os" value={asset.server_os} onChange={handleInputChange} />
                    </label>
                    <label>
                      OS Version:
                      <input type="text" name="server_osversion" value={asset.server_osversion} onChange={handleInputChange} />
                    </label>
                    <label>
                      Manufacturer:
                      <input type="text" name="server_manufacturer" value={asset.server_manufacturer} onChange={handleInputChange} />
                    </label>
                    <label>
                      Model:
                      <input type="text" name="server_model" value={asset.server_model} onChange={handleInputChange} />
                    </label>
                    <label>
                      CPU:
                      <input type="text" name="server_cpu" value={asset.server_cpu} onChange={handleInputChange} />
                    </label>
                    <label>
                      Location:
                      <input type="text" name="server_standort" value={asset.server_standort} onChange={handleInputChange} />
                    </label>
                    <label>
                      Description:
                      <input type="text" name="server_description" value={asset.server_description} onChange={handleInputChange} />
                    </label>
                  </>
                )}

                {/* Software Form */}
                {assetTypeSelection === 'Software' && (
                  <>
                    <label>
                      Name:
                      <input type="text" name="software_name" value={asset.software_name} onChange={handleInputChange} />
                    </label>
                    <label>
                      Version:
                      <input type="text" name="software_version" value={asset.software_version} onChange={handleInputChange} />
                    </label>
                    <label>
                      Manufacturer:
                      <input type="text" name="software_manufacturer" value={asset.software_manufacturer} onChange={handleInputChange} />
                    </label>
                    <label>
                      Status:
                      <input type="text" name="software_status" value={asset.software_status} onChange={handleInputChange} />
                    </label>
                    <label>
                      Description:
                      <input type="text" name="software_description" value={asset.software_description} onChange={handleInputChange} />
                    </label>
                  </>
                )}

                {/* Other IT-Assets Form */}
                {assetTypeSelection === 'Andere Geräte' && (
                  <>
                    <label>
                      Name:
                      <input type="text" name="other_name" value={asset.other_name} onChange={handleInputChange} />
                    </label>
                    <label>
                      Category:
                      <input type="text" name="other_category" value={asset.other_category} onChange={handleInputChange} />
                    </label>
                    <label>
                      OS:
                      <input type="text" name="other_os" value={asset.other_os} onChange={handleInputChange} />
                    </label>
                    <label>
                      OS Version:
                      <input type="text" name="other_osversion" value={asset.other_osversion} onChange={handleInputChange} />
                    </label>
                    <label>
                      Manufacturer:
                      <input type="text" name="other_manufacturer" value={asset.other_manufacturer} onChange={handleInputChange} />
                    </label>
                    <label>
                      Model:
                      <input type="text" name="other_model" value={asset.other_model} onChange={handleInputChange} />
                    </label>
                    <label>
                      Description:
                      <input type="text" name="other_description" value={asset.other_description} onChange={handleInputChange} />
                    </label>
                  </>
                )}

                <button onClick={handleAddAsset}>Add Asset</button>
                <button onClick={handleBackToTypeSelection}>Back</button>
                <button onClick={() => setShowPopup(false)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {showUpdatePopup && (
          <div className="popup">
              <div className="popup-inner">
                  <>
                      <h2>Edit Asset Information</h2>
                      <form>
                          {selectedAsset && selectedAsset.asset_type === 'Endgerät' && (
                              <>
                                  <label>Name:</label>
                                  <input type="text" name="enddevice_name" value={asset.enddevice_name || selectedAsset.name || ''} onChange={handleInputChange} />

                                  <label>OS:</label>
                                  <input type="text" name="enddevice_os" value={asset.enddevice_os || selectedAsset.os || ''} onChange={handleInputChange} />

                                  <label>OS Version:</label>
                                  <input type="text" name="enddevice_osversion" value={asset.enddevice_osversion || selectedAsset.osversion || ''} onChange={handleInputChange} />

                                  <label>Manufacturer:</label>
                                  <input type="text" name="enddevice_manufacturer" value={asset.enddevice_manufacturer || selectedAsset.manufacturer || ''} onChange={handleInputChange} />

                                  <label>Model:</label>
                                  <input type="text" name="enddevice_model" value={asset.enddevice_model || selectedAsset.model || ''} onChange={handleInputChange} />
                                  
                                  <label>CPU:</label>
                                  <input type="text" name="enddevice_cpu" value={asset.enddevice_cpu || selectedAsset.cpu || ''} onChange={handleInputChange} />

                                  <label>GPU:</label>
                                  <input type="text" name="enddevice_gpu" value={asset.enddevice_gpu || selectedAsset.gpu || ''} onChange={handleInputChange} />

                                  <label>Owner:</label>
                                  <input type="text" name="enddevice_owner" value={asset.enddevice_owner || selectedAsset.owner || ''} onChange={handleInputChange} />

                                  <label>Status:</label>
                                  <input type="text" name="enddevice_status" value={asset.enddevice_status || selectedAsset.status || ''} onChange={handleInputChange} />

                                  <label>Description:</label>
                                  <input type="text" name="enddevice_description" value={asset.enddevice_description || selectedAsset.description || ''} onChange={handleInputChange} />
                              </>
                          )}

                          {selectedAsset && selectedAsset.asset_type === 'Server' && (
                              <>
                                  <label>Name:</label>
                                  <input type="text" name="server_name" value={asset.server_name || selectedAsset.name || ''} onChange={handleInputChange}/>

                                  <label>OS:</label>
                                  <input type="text" name="server_os" value={asset.server_os || selectedAsset.os || ''} onChange={handleInputChange} />

                                  <label>OS Version:</label>
                                  <input type="text" name="server_osversion" value={asset.server_osversion || selectedAsset.osversion || ''} onChange={handleInputChange} />

                                  <label>Manufacturer:</label>
                                  <input type="text" name="server_manufacturer" value={asset.server_manufacturer || selectedAsset.manufacturer || ''} onChange={handleInputChange} />

                                  <label>Model:</label>
                                  <input type="text" name="server_model" value={asset.server_model || selectedAsset.model || ''} onChange={handleInputChange} />

                                  <label>CPU:</label>
                                  <input type="text" name="server_cpu" value={asset.server_cpu || selectedAsset.cpu || ''} onChange={handleInputChange} />

                                  <label>Location:</label>
                                  <input type="text" name="server_standort" value={asset.server_standort || selectedAsset.standort || ''} onChange={handleInputChange} />

                                  <label>Description:</label>
                                  <input type="text" name="server_description" value={asset.server_description || selectedAsset.description || ''} onChange={handleInputChange} />
                              </>
                          )}

                          {selectedAsset && selectedAsset.asset_type === 'Software' && (
                              <>
                                  <label>Name:</label>
                                  <input type="text" name="software_name" value={asset.software_name || selectedAsset.name || ''} onChange={handleInputChange} />

                                  <label>Version:</label>
                                  <input type="text" name="software_version" value={asset.software_version || selectedAsset.version || ''} onChange={handleInputChange} />

                                  <label>Manufacturer:</label>
                                  <input type="text" name="software_manufacturer" value={asset.software_manufacturer || selectedAsset.manufacturer || ''} onChange={handleInputChange} />

                                  <label>Status:</label>
                                  <input type="text" name="software_status" value={asset.software_status || selectedAsset.status || ''} onChange={handleInputChange} />

                                  <label>Description:</label>
                                  <input type="text" name="software_description" value={asset.software_description || selectedAsset.description || ''} onChange={handleInputChange} />
                              </>
                          )}

                          {selectedAsset && selectedAsset.asset_type === 'Andere Geräte' && (
                              <>
                                  <label>Name:</label>
                                  <input type="text" name="other_name" value={asset.other_name || selectedAsset.name || ''} onChange={handleInputChange}/>

                                  <label>Category:</label>
                                  <input type="text" name="other_category" value={asset.other_category || selectedAsset.category || ''} onChange={handleInputChange} />

                                  <label>OS:</label>
                                  <input type="text" name="other_os" value={asset.other_os || selectedAsset.os || ''} onChange={handleInputChange} />

                                  <label>OS Version:</label>
                                  <input type="text" name="other_osversion" value={asset.other_osversion || selectedAsset.osversion || ''} onChange={handleInputChange} />

                                  <label>Manufacturer:</label>
                                  <input type="text" name="other_manufacturer" value={asset.other_manufacturer || selectedAsset.manufacturer || ''} onChange={handleInputChange} />

                                  <label>Model:</label>
                                  <input type="text" name="other_model" value={asset.other_model || selectedAsset.model || ''} onChange={handleInputChange} />

                                  <label>Description:</label>
                                  <input type="text" name="other_description" value={asset.other_description || selectedAsset.description || ''} onChange={handleInputChange} />
                              </>
                          )}
                      </form>
                      <button onClick={handleSaveUpdate}>Save Changes</button>
                      <button onClick={() => setShowUpdatePopup(false)}>Cancel</button>
                  </>
              </div>
          </div>
      )}
    </div>
  );
};

export default AssetPage;
