import { NextResponse } from 'next/server';
import { loadExperiences } from '@/lib/experienceLoader';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const experiences = loadExperiences();
    return NextResponse.json({ experiences });
  } catch (error) {
    console.error('Error loading experiences:', error);
    return NextResponse.json(
      { error: 'Failed to load experiences' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const experienceDir = path.join(process.cwd(), 'data', 'experience');
    
    if (!fs.existsSync(experienceDir)) {
      fs.mkdirSync(experienceDir, { recursive: true });
    }
    
    const filename = data.company
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '.json';
    
    const filepath = path.join(experienceDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      filename,
      message: 'Experience saved successfully' 
    });
  } catch (error) {
    console.error('Error saving experience:', error);
    return NextResponse.json(
      { error: 'Failed to save experience' },
      { status: 500 }
    );
  }
}
