import { NextResponse } from 'next/server';
import { loadSkills } from '@/lib/skillsLoader';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const skills = loadSkills();
    return NextResponse.json({ skills });
  } catch (error) {
    console.error('Error loading skills:', error);
    return NextResponse.json(
      { error: 'Failed to load skills' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const skillsDir = path.join(process.cwd(), 'data', 'skills');
    
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    
    const filename = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '.json';
    
    const filepath = path.join(skillsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      filename,
      message: 'Skill category saved successfully' 
    });
  } catch (error) {
    console.error('Error saving skill:', error);
    return NextResponse.json(
      { error: 'Failed to save skill' },
      { status: 500 }
    );
  }
}
