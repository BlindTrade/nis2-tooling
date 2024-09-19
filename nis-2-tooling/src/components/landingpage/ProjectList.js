import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ProjectList() {
  const [data, setData] = useState([]);
  const navigate = useNavigate(); // Use navigate hook from react-router-dom

  useEffect(() => {
    fetch('http://localhost:8081/project')
      .then(res => res.json())
      .then(data => setData(data))
      .catch(err => console.log(err));
  }, []);

  const handleProjectClick = (projectId) => {
    navigate(`/assets/${projectId}`);
  };

  return (
    <div>
      {data.map((d, i) => (
        <ul key={i}>
          <li onClick={() => handleProjectClick(d.project_id)} style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}>
            {d.project_name}
          </li>
        </ul>
      ))}
    </div>
  );
}

export default ProjectList;