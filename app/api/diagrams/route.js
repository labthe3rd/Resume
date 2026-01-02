import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const data = await request.json();
    const diagramsDir = path.join(process.cwd(), 'data', 'diagrams');
    
    if (!fs.existsSync(diagramsDir)) {
      fs.mkdirSync(diagramsDir, { recursive: true });
    }
    
    const filename = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '.json';
    
    const filepath = path.join(diagramsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      filename,
      message: 'Diagram saved successfully' 
    });
  } catch (error) {
    console.error('Error saving diagram:', error);
    return NextResponse.json(
      { error: 'Failed to save diagram' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const diagramsDir = path.join(process.cwd(), 'data', 'diagrams');
    
    if (!fs.existsSync(diagramsDir)) {
      return NextResponse.json({ diagrams: [] });
    }

    const files = fs.readdirSync(diagramsDir).filter(file => 
      file.endsWith('.json') && !file.startsWith('_')
    );
    
    const diagrams = files.map(file => {
      const filePath = path.join(diagramsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return {
        ...JSON.parse(fileContent),
        filename: file
      };
    });

    return NextResponse.json({ diagrams });
  } catch (error) {
    console.error('Error loading diagrams:', error);
    return NextResponse.json(
      { error: 'Failed to load diagrams' },
      { status: 500 }
    );
  }
}
