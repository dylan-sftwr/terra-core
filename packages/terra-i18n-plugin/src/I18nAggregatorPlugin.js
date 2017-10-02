import path from 'path';

let supportedLocales;

function generateTranslationFile(language, messages) {
  return `import { addLocaleData } from 'react-intl';
import localeData from 'react-intl/locale-data/${language.split('-')[0]}';

addLocaleData(localeData);

const messages = ${JSON.stringify(messages, null, 2)};

module.exports = {
  areTranslationsLoaded: true,
  locale: '${language}',
  messages,
};`;
}

function getDirectories(srcPath, compiler) {
  return compiler.inputFileSystem.readdirSync(srcPath).filter(file => compiler.inputFileSystem.statSync(path.join(srcPath, file)).isDirectory());
}

function aggregateDirectory(languageMessages, currentDirectory, compiler) {
  // Check the directory for translations
  const translationsDirectory = path.resolve(currentDirectory, 'translations');
  try {
    // Check if the directory exists by attempting to read from it
    compiler.inputFileSystem.readdirSync(translationsDirectory);

    // Check the directory for each translation file
    supportedLocales.forEach((language) => {
      const translationFile = path.resolve(translationsDirectory, `${language}.json`);
      try {
        Object.assign(languageMessages[language], JSON.parse(compiler.inputFileSystem.readFileSync(translationFile, 'utf8')));
      } catch (e) {
        console.warn(`Translation file ${language}.json not found for ${translationsDirectory}`);
      }
    });
  } catch (e) {}

  // Check the directory's node_modules for translation files
  const nodeMoudlesPath = path.resolve(currentDirectory, 'node_modules');
  try {
    getDirectories(nodeMoudlesPath, compiler).forEach((module) => {
      aggregateDirectory(languageMessages, path.resolve(nodeMoudlesPath, module), compiler);
    });
  } catch (e) {}

  return languageMessages;
}

function aggregateTranslations(options, compiler) {
  compiler.plugin("compile", function(params) {
    if (!options.baseDirectory) {
      throw new Error('Please included the base directory path in the plugin options.');
    }

    if (!options.supportedLocales) {
      throw new Error('Please included the supported locales in the plugin options.');
    }

    supportedLocales = options.supportedLocales;

    let languageMessages = {};
    supportedLocales.forEach((language) => { languageMessages[language] = {}; });

    // Aggregate translation messages for the directory
    languageMessages = aggregateDirectory(languageMessages, options.baseDirectory, compiler);

    // Create the aggregated-translations directory
    compiler.outputFileSystem.mkdirpSync(path.resolve(options.baseDirectory, 'aggregated-translations'));

    // Create a file for each language for the aggregated messages
    supportedLocales.forEach((language) => {
      if (language in languageMessages) {
        compiler.outputFileSystem.writeFileSync(path.resolve(options.baseDirectory, 'aggregated-translations', `${language}.js`),
          generateTranslationFile(language, languageMessages[language]));
      } else {
        throw new Error(`Translation file found for ${language}.json, but translations were not loaded correctly. Please check that your translated modules were installed correctly.`);
      }
    });
  });
}

module.exports = (options) => {
  let updatedOptions = options;
  if (updatedOptions instanceof Array) {
    updatedOptions = {
      include: updatedOptions,
    };
  }

  if (!Array.isArray(updatedOptions.include)) {
    updatedOptions.include = [updatedOptions.include];
  }

  return {
    apply: aggregateTranslations.bind(this, updatedOptions),
  };
};
