#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var promises_1 = require("fs/promises");
var path_1 = require("path");
var chalk_1 = require("chalk");
var glob_1 = require("glob");
var url_1 = require("url");
// Pour remplacer __dirname dans les modules ES
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var projectRoot = path_1.default.resolve(__dirname, '../..');
function testFileDetection() {
    return __awaiter(this, void 0, void 0, function () {
        var directories, extensions, resultsByExt, _i, directories_1, directory, fullDirPath, error_1, _loop_1, _a, extensions_1, ext, _b, extensions_2, ext, files;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log(chalk_1.default.blue('🔍 Test de détection des fichiers...'));
                    console.log(chalk_1.default.blue("\uD83D\uDCC1 R\u00E9pertoire racine du projet: ".concat(projectRoot)));
                    directories = [
                        'src/app',
                        'src/components',
                        'src/hooks',
                        'src/lib',
                        'src/server',
                    ];
                    extensions = ['ts', 'tsx', 'js', 'jsx'];
                    resultsByExt = {};
                    _i = 0, directories_1 = directories;
                    _c.label = 1;
                case 1:
                    if (!(_i < directories_1.length)) return [3 /*break*/, 10];
                    directory = directories_1[_i];
                    fullDirPath = path_1.default.resolve(projectRoot, directory);
                    console.log(chalk_1.default.blue("\uD83D\uDCC1 Test du r\u00E9pertoire: ".concat(fullDirPath)));
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, promises_1.default.access(fullDirPath)];
                case 3:
                    _c.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _c.sent();
                    console.log(chalk_1.default.yellow("\u26A0\uFE0F Le r\u00E9pertoire ".concat(fullDirPath, " n'existe pas ou n'est pas accessible")));
                    return [3 /*break*/, 9];
                case 5:
                    _loop_1 = function (ext) {
                        var patterns, _d, _e, _f, index, pattern, files, todoFiles, error_2;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    patterns = [
                                        "".concat(fullDirPath, "/**/*.").concat(ext), // Méthode 1: chemin absolu + pattern glob
                                        path_1.default.join(fullDirPath, '**', "*.".concat(ext)), // Méthode 2: path.join
                                        "".concat(directory, "/**/*.").concat(ext),
                                    ];
                                    console.log(chalk_1.default.blue("\uD83D\uDD0D Test de l'extension .".concat(ext, ":")));
                                    _d = 0, _e = patterns.entries();
                                    _g.label = 1;
                                case 1:
                                    if (!(_d < _e.length)) return [3 /*break*/, 6];
                                    _f = _e[_d], index = _f[0], pattern = _f[1];
                                    _g.label = 2;
                                case 2:
                                    _g.trys.push([2, 4, , 5]);
                                    console.log(chalk_1.default.blue("  [".concat(index + 1, "] Pattern: ").concat(pattern)));
                                    return [4 /*yield*/, (0, glob_1.glob)(pattern, {
                                            ignore: ['**/node_modules/**'],
                                            cwd: index === 2 ? projectRoot : undefined // Utiliser cwd uniquement pour le pattern relatif
                                        })];
                                case 3:
                                    files = _g.sent();
                                    console.log(chalk_1.default.green("  \u2705 ".concat(files.length, " fichiers trouv\u00E9s avec la m\u00E9thode ").concat(index + 1)));
                                    // Stocker les résultats
                                    if (!resultsByExt[ext]) {
                                        resultsByExt[ext] = [];
                                    }
                                    // Afficher quelques fichiers trouvés
                                    if (files.length > 0) {
                                        console.log(chalk_1.default.green("  \uD83D\uDCC4 Exemples de fichiers trouv\u00E9s:"));
                                        files.slice(0, 3).forEach(function (file) {
                                            console.log(chalk_1.default.green("    - ".concat(file)));
                                            resultsByExt[ext].push(file);
                                        });
                                    }
                                    todoFiles = files.filter(function (file) { return file.includes('todo') || file.includes('Todo'); });
                                    if (todoFiles.length > 0) {
                                        console.log(chalk_1.default.green("  \uD83C\uDFAF Fichiers Todo trouv\u00E9s (".concat(todoFiles.length, "):")));
                                        todoFiles.forEach(function (file) {
                                            console.log(chalk_1.default.green("    - ".concat(file)));
                                        });
                                    }
                                    else if (files.length > 0) {
                                        console.log(chalk_1.default.yellow("  \u26A0\uFE0F Aucun fichier Todo trouv\u00E9 avec ce pattern"));
                                    }
                                    return [3 /*break*/, 5];
                                case 4:
                                    error_2 = _g.sent();
                                    console.error(chalk_1.default.red("  \u274C Erreur avec le pattern ".concat(pattern, ": ").concat(error_2)));
                                    return [3 /*break*/, 5];
                                case 5:
                                    _d++;
                                    return [3 /*break*/, 1];
                                case 6: return [2 /*return*/];
                            }
                        });
                    };
                    _a = 0, extensions_1 = extensions;
                    _c.label = 6;
                case 6:
                    if (!(_a < extensions_1.length)) return [3 /*break*/, 9];
                    ext = extensions_1[_a];
                    return [5 /*yield**/, _loop_1(ext)];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8:
                    _a++;
                    return [3 /*break*/, 6];
                case 9:
                    _i++;
                    return [3 /*break*/, 1];
                case 10:
                    // Résumé
                    console.log(chalk_1.default.blue('\n📊 Résumé des fichiers trouvés:'));
                    for (_b = 0, extensions_2 = extensions; _b < extensions_2.length; _b++) {
                        ext = extensions_2[_b];
                        files = resultsByExt[ext] || [];
                        console.log(chalk_1.default.blue("  .".concat(ext, ": ").concat(files.length, " fichiers uniques")));
                    }
                    return [2 /*return*/];
            }
        });
    });
}
// Exécuter le test
testFileDetection().catch(function (error) {
    console.error(chalk_1.default.red("\u274C Erreur d'ex\u00E9cution: ".concat(error)));
});
