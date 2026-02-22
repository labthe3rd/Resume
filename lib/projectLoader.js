import fs from 'fs'
import path from 'path'

// A map of icon names used throughout the project cards. Leave untouched.
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
}

/**
 * Load all project JSON files from the data/projects directory. In addition
 * to ignoring files prefixed with an underscore, this customised loader
 * explicitly excludes VR and other demo projects that do not reinforce the
 * core narrative. If new files are added that should be excluded, append
 * their filenames to the excludedFiles set below.
 */
export function loadProjects() {
  const projectsDir = path.join(process.cwd(), 'data', 'projects')

  if (!fs.existsSync(projectsDir)) {
    return []
  }

  // List of filenames to ignore (case-sensitive). These represent VR and demo
  // projects that dilute the professional focus of the portfolio.
  const excludedFiles = new Set([
    'delirium-virtual-reality-muisc-venue-software-design.json',
    'metaplaza-vr-ad-revenue-service-web-application-game-assets.json',
    'universal-music-group-sweden-virtual-reality-music-venue-software-design.json',
    'vr-theater.json'
  ])

  const files = fs.readdirSync(projectsDir).filter(file => {
    return file.endsWith('.json') && !file.startsWith('_') && !excludedFiles.has(file)
  })

  const projects = files.map(file => {
    const filePath = path.join(projectsDir, file)
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const project = JSON.parse(fileContent)
    return {
      ...project,
      iconName: project.icon
    }
  })
  return projects
}

export function getCategories(projects) {
  const categories = ['All', ...new Set(projects.map(p => p.category))]
  return categories
}