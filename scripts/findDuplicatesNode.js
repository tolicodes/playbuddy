const fs = require('fs');
const yaml = require('js-yaml');
const Fuse = require('fuse.js');

const filePath = './public/kinks.yaml'; // Adjust this path as needed

const loadYAML = (filePath) => {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
  } catch (e) {
    console.error(e);
    return null;
  }
};

const findDuplicates = (kinks) => {
  const fuse = new Fuse(kinks, {
    includeScore: true,
    keys: ['idea_title'],
    threshold: 0.3, // Adjust this threshold as needed
  });
  let tableData = [];

  kinks.forEach((kink, index) => {
    const results = fuse
      .search(kink.idea_title)
      .filter(
        (result) =>
          result.score <= 0.3 && result.item.idea_title !== kink.idea_title,
      );
    if (results.length > 0) {
      let rowData = { Initial: kink.idea_title };
      results.forEach((similarTitle, i) => {
        rowData[`Duplicate${i + 1}`] = similarTitle.item.idea_title;
      });
      tableData.push(rowData);
    }
  });

  if (tableData.length > 0) {
    console.table(tableData);
  } else {
    console.log('No duplicates or similar titles found.');
  }
};

const main = () => {
  const kinks = loadYAML(filePath);
  if (kinks) findDuplicates(kinks);
};

main();
