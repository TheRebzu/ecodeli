import './jest.setup.types';

// Mocks pour les tests node
global.fetch = jest.fn();

// Autres configurations globales pour les tests
jest.setTimeout(10000); 