import { NextResponse } from 'next/server';
import { loadProjects, getCategories } from '@/lib/projectLoader';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const projects = loadProjects();
    const categories = getCategories(projects);
    
    return NextResponse.json({
      projects,
      categories
    });
  } catch (error) {
    console.error('Error loading projects:', error);
    return NextResponse.json(
      { error: 'Failed to load projects' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const projectsDir = path.join(process.cwd(), 'data', 'projects');
    
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }
    
    const filename = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '.json';
    
    const filepath = path.join(projectsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      filename,
      message: 'Project saved successfully' 
    });
  } catch (error) {
    console.error('Error saving project:', error);
    return NextResponse.json(
      { error: 'Failed to save project' },
      { status: 500 }
    );
  }
}
