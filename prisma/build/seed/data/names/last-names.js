"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lastNames = void 0;
exports.getRandomLastName = getRandomLastName;
exports.getRandomFullName = getRandomFullName;
exports.lastNames = [
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
];
function getRandomLastName() {
    return exports.lastNames[Math.floor(Math.random() * exports.lastNames.length)];
}
function getRandomFullName(gender) {
    const { getRandomFirstName } = require('./first-names');
    const firstName = getRandomFirstName(gender);
    const lastName = getRandomLastName();
    return {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`
    };
}
