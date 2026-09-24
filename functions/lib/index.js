"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = exports.onGradeApproved = exports.onMiniPautaApproved = exports.recalculateClassStats = exports.onAccessLogCreated = exports.linkParentToStudent = exports.provisionTeacherClass = exports.provisionTerminalDevice = exports.enrollTeacher = exports.enrollStudent = void 0;
const admin = __importStar(require("firebase-admin"));
// Inicializar SDK Admin do Firebase
if (!admin.apps.length) {
    admin.initializeApp();
}
// Exportar Funções de Matrícula, Professores e Dispositivos (HTTPS Callables)
var auth_1 = require("./auth");
Object.defineProperty(exports, "enrollStudent", { enumerable: true, get: function () { return auth_1.enrollStudent; } });
Object.defineProperty(exports, "enrollTeacher", { enumerable: true, get: function () { return auth_1.enrollTeacher; } });
Object.defineProperty(exports, "provisionTerminalDevice", { enumerable: true, get: function () { return auth_1.provisionTerminalDevice; } });
Object.defineProperty(exports, "provisionTeacherClass", { enumerable: true, get: function () { return auth_1.provisionTeacherClass; } });
Object.defineProperty(exports, "linkParentToStudent", { enumerable: true, get: function () { return auth_1.linkParentToStudent; } });
// Exportar Triggers Reativos do Firestore
var triggers_1 = require("./triggers");
Object.defineProperty(exports, "onAccessLogCreated", { enumerable: true, get: function () { return triggers_1.onAccessLogCreated; } });
Object.defineProperty(exports, "recalculateClassStats", { enumerable: true, get: function () { return triggers_1.recalculateClassStats; } });
Object.defineProperty(exports, "onMiniPautaApproved", { enumerable: true, get: function () { return triggers_1.onMiniPautaApproved; } });
Object.defineProperty(exports, "onGradeApproved", { enumerable: true, get: function () { return triggers_1.onGradeApproved; } });
// Exportar Função de Seeding Administrativo
var seed_1 = require("./seed");
Object.defineProperty(exports, "seedDatabase", { enumerable: true, get: function () { return seed_1.seedDatabase; } });
//# sourceMappingURL=index.js.map