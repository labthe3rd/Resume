import fs from 'fs';
import path from 'path';

const iconsMap = {
  Clock: 'Clock',
  DollarSign: 'DollarSign',
  Shield: 'Shield',
  Cpu: 'Cpu',
  Bot: 'Bot',
  Wrench: 'Wrench',
  Zap: 'Zap',
  Eye: 'Eye',
  Castle: 'Castle'
};

export function loadProjects() {
  const projectsDir = path.join(process.cwd(), 'data', 'projects');
  
  if (!fs.existsSync(projectsDir)) {
    return [];
  }

  const files = fs.readdirSync(projectsDir).filter(file => file.endsWith('.json'));
  
  const projects = files.map(file => {
    const filePath = path.join(projectsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const project = JSON.parse(fileContent);
    
    return {
      ...project,
      iconName: project.icon
    };
  });

  return projects;
}

export function getCategories(projects) {
  const categories = ['All', ...new Set(projects.map(p => p.category))];
  return categories;
}
