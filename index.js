const core = require('@actions/core');
const minimatch = require('minimatch');
const parse = require('lcov-parse');
const fs = require('fs');

function run() {
  const lcovPath = core.getInput('path');
  const excluded = core.getInput('exclude');
  const excludedFiles = excluded.split(' ');

  if (!canParse(lcovPath)) {
    return;
  }

  parse(lcovPath, (_, data) => {
    if (typeof data === 'undefined') {
      core.setFailed('parsing error!');
      return;
    }

    const linesMissingCoverage = [];

    let totalFinds = 0;
    let totalHits = 0;
    data.forEach((element) => {
      if (shouldCalculateCoverageForFile(element['file'], excludedFiles)) {
        totalFinds += element['lines']['found'];
        totalHits += element['lines']['hit'];

        for (const lineDetails of element['lines']['details']) {
          const hits = lineDetails['hit'];

          if (hits === 0) {
            const fileName = element['file'];
            const lineNumber = lineDetails['line'];
            linesMissingCoverage[fileName] =
              linesMissingCoverage[fileName] || [];
            linesMissingCoverage[fileName].push(lineNumber);
          }
        }
      }
    });
    const coverage = (totalHits / totalFinds) * 100;
    
    core.debug(`Code Coverage ${coverage}`);
    
    core.setOutput('code_coverage', coverage);
  });
}

function shouldCalculateCoverageForFile(fileName, excludedFiles) {
  for (let i = 0; i < excludedFiles.length; i++) {
    const isExcluded = minimatch(fileName, excludedFiles[i]);
    if (isExcluded) {
      core.debug(`Excluding ${fileName} from coverage`);
      return false;
    }
  }
  return true;
}

function canParse(path) {
  if (fs.existsSync(path) && fs.readFileSync(path).length === 0) {
    core.setFailed('lcov is empty!');
    return false;
  }

  return true;
}

run();