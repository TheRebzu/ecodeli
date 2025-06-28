export const firstNames = {
  male: [
    'Jean', 'Pierre', 'Michel', 'André', 'Philippe',
    'Jacques', 'Alain', 'Bernard', 'Daniel', 'François',
    'Laurent', 'Nicolas', 'Stéphane', 'Patrick', 'Christophe',
    'David', 'Julien', 'Thomas', 'Alexandre', 'Antoine',
    'Maxime', 'Lucas', 'Hugo', 'Louis', 'Raphaël',
    'Paul', 'Arthur', 'Gabriel', 'Mathieu', 'Vincent'
  ],
  female: [
    'Marie', 'Jeanne', 'Françoise', 'Monique', 'Catherine',
    'Nathalie', 'Isabelle', 'Sylvie', 'Martine', 'Christine',
    'Sophie', 'Anne', 'Céline', 'Véronique', 'Stéphanie',
    'Sandrine', 'Valérie', 'Caroline', 'Julie', 'Aurélie',
    'Émilie', 'Marion', 'Sarah', 'Laura', 'Camille',
    'Emma', 'Léa', 'Chloé', 'Manon', 'Inès'
  ]
}

export function getRandomFirstName(gender?: 'male' | 'female'): string {
  if (gender) {
    const names = firstNames[gender]
    return names[Math.floor(Math.random() * names.length)]
  }
  
  const allNames = [...firstNames.male, ...firstNames.female]
  return allNames[Math.floor(Math.random() * allNames.length)]
} 