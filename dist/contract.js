/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/contract.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/contract.js":
/*!*************************!*\
  !*** ./src/contract.js ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("document.getElementById(\"form\").addEventListener(\"submit\", (e) => {\n    if (!document.getElementById(\"name\").value.trim().length) {\n        alert(\"Please input contract function name!\")\n        e.preventDefault();\n    }\n\n    // TODO: more input validation\n})\n\nfunction replaceAll(text, search, replacement) {\n    return text.split(search).join(replacement);\n}\n\nfunction buildData() {\n    let pText = document.getElementById(\"params\").value;\n    pText = replaceAll(pText, \"\\r\", \"\\n\");\n    pText = replaceAll(pText, \"\\n\\n\", \"\\n\");\n    let params = pText.split(\"\\n\").filter((e) => {\n        return e.trim().length;\n    })\n\n    var data = {\n        op: 1,\n        name: document.getElementById(\"name\").value,\n        params: params\n    }\n\n    document.getElementById(\"data\").value = JSON.stringify(data); \n}\n\nasync function fillContracts() {\n    const contracts = await fetch(\"/api/contracts\")\n    .then((resp) => {\n        return resp.json();\n    })\n    if (!contracts.length) return;\n\n    var select = document.getElementById(\"to\");\n    contracts.forEach(item => {\n        let option = document.createElement(\"option\");\n        option.value = item;\n        option.textContent = item;\n        select.appendChild(option);\n    });\n\n    fillFuncs();\n    select.addEventListener(\"change\", fillFuncs);\n}\n\nasync function fillFuncs() {\n    var contract = document.getElementById(\"to\").value;\n    if (!contract) return;\n\n    const funcs = await fetch(\"/api/funcs?contract=\" + contract)\n    .then((resp) => {\n        return resp.json();\n    })\n    var select = document.getElementById(\"name\");\n    select.innerHTML = \"\";\n    funcs.forEach(item => {\n        if (item.indexOf(\"$\") !== 0) {\n            let option = document.createElement(\"option\");\n            option.value = item;\n            option.textContent = item;\n            select.appendChild(option);\n        }\n    });\n    buildData();\n}\n\nbuildData();\ndocument.getElementById(\"name\").addEventListener(\"change\", buildData);\ndocument.getElementById(\"params\").addEventListener(\"input\", buildData);\nfillContracts();\n\n\n//# sourceURL=webpack:///./src/contract.js?");

/***/ })

/******/ });