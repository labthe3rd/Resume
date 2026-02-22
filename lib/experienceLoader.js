import fs from 'fs'
import path from 'path'

/**
 * Load all experience JSON files from the data/experience directory. Files
 * prefixed with an underscore are ignored by convention. Additionally,
 * specific side projects and non-core roles (such as tutoring or VR demos)
 * are explicitly excluded to maintain a focused professional narrative.
 */
export function loadExperiences() {
  const experienceDir = path.join(process.cwd(), 'data', 'experience')

  if (!fs.existsSync(experienceDir)) {
    return []
  }

  // Explicitly ignore these filenames along with any file that starts with '_'.
  const excludedFiles = new Set([
    'the-party-zone-vr.json',
    'trio-math-tutor.json'
  ])

  const files = fs
    .readdirSync(experienceDir)
    .filter(file => file.endsWith('.json') && !file.startsWith('_') && !excludedFiles.has(file))

  const experiences = files.map(file => {
    const filePath = path.join(experienceDir, file)
    const fileContent = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(fileContent)
  })
  return experiences
}