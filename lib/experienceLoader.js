import fs from 'fs';
import path from 'path';

export function loadExperiences() {
  const experienceDir = path.join(process.cwd(), 'data', 'experience');
  
  if (!fs.existsSync(experienceDir)) {
    return [];
  }

  const files = fs.readdirSync(experienceDir).filter(file => file.endsWith('.json') && !file.startsWith('_'));
  
  const experiences = files.map(file => {
    const filePath = path.join(experienceDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  });

  return experiences;
}
