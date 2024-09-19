import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../style/LandingPage.css';
import ProjectList from './ProjectList';

const LandingPage = () => {
  const navigate = useNavigate();

  const createNewProject = async () => {
    const projectName = prompt("Enter the name of the new project:");
    if (projectName) {
      try {
        const response = await fetch('http://localhost:8081/project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: projectName }),
        });

        if (response.ok) {
          const data = await response.json();
          alert(`Project created with ID: ${data.projectId}`);
          navigate(`/assets/${data.projectId}`); // Navigate to AssetPage with projectId
        } else {
          alert('Failed to create project');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to create project');
      }
    }
  };

  return (
    <div className="landing-page">
      <section className="section-left">
        <div className="new-list">
          <h1 className="big-text-left">New</h1>
          <button className="btn-new" onClick={createNewProject}>+</button>
        </div>
        <div className="open-list">
          <h1 className="big-text-left">Open</h1>
          <div className="items-list">
            <ProjectList />
          </div>
        </div>
      </section>

      <div className="line"/>

      <section className="section-right">
        <h1 className="big-text-right">NIS2 Assetrisk Tooling</h1>
        <p className="explanation">
          Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.
        </p>
      </section>
    </div>
  );
};

export default LandingPage;
