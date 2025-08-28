import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';


const NOTES_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'notes.json');

// GET: Return the saved notes
export async function GET() {
  try {
    const data = await readFile(NOTES_FILE_PATH, 'utf-8');
    const notes = JSON.parse(data);
    return NextResponse.json({ notes });
  } catch (err) {
    // If file doesn't exist or another error, return empty list
    console.error('Error reading notes:', err);
    return NextResponse.json({ notes: [] });
  }
}

// POST: Add a new note to the file
export async function POST(req: NextRequest) {
  try {
    const { note } = await req.json();

    if (!note || typeof note !== 'string') {
      return NextResponse.json({ error: 'Invalid note' }, { status: 400 });
    }

    let notes: string[] = [];

    try {
      const data = await readFile(NOTES_FILE_PATH, 'utf-8');
      notes = JSON.parse(data);
    } catch {
      // File might not exist yet, that's okay
      notes = [];
    }

    notes.push(note);

    await writeFile(NOTES_FILE_PATH, JSON.stringify(notes, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving note:', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
