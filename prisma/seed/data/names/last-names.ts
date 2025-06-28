export const lastNames = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert',
  'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
  'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia',
  'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
  'Morel', 'Girard', 'André', 'Lefèvre', 'Mercier',
  'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez',
  'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc',
  'Guérin', 'Muller', 'Henry', 'Roussel', 'Nicolas',
  'Perrin', 'Morin', 'Mathieu', 'Clément', 'Gauthier',
  'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin'
]

export function getRandomLastName(): string {
  return lastNames[Math.floor(Math.random() * lastNames.length)]
}

export function getRandomFullName(gender?: 'male' | 'female'): { firstName: string; lastName: string; fullName: string } {
  const { getRandomFirstName } = require('./first-names')
  const firstName = getRandomFirstName(gender)
  const lastName = getRandomLastName()
  
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`
  }
} 