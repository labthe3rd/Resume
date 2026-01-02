import fs from 'fs';
import path from 'path';

export function loadSkills() {
  const skillsDir = path.join(process.cwd(), 'data', 'skills');
  
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  const files = fs.readdirSync(skillsDir).filter(file => file.endsWith('.json') && !file.startsWith('_'));
  
  const skills = files.map(file => {
    const filePath = path.join(skillsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const skill = JSON.parse(fileContent);
    return {
      ...skill,
      iconName: skill.icon
    };
  });

  return skills;
}
