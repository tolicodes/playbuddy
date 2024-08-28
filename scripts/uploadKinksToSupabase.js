// Run this from the root
// source .env 
// SUPABASE_HOST=$SUPABASE_HOST SUPABASE_ADMIN_KEY=$SUPABASE_ADMIN_KEY node scripts/uploadKinksToSupabase.js

const fs = require('fs');

const { supabaseClient } = require('./supabaseClient');

const yaml = require('js-yaml');

// Function to load JSON data
const loadData = () => {
  const data = fs.readFileSync('./public/kinks.yaml', 'utf8');
  return yaml.load(data);
};

// Function to perform the upsert operation
const upsertData = async (data) => {
  for (const item of data) {
    const { data: upsertData, error } = await supabaseClient.from('kinks').upsert(
      {
        idea_title: item.idea_title,
        level: item.level,
        // at_home: item.at_home,
        materials_required: item.materials_required,
        idea_description: item.idea_description,
        categories: item.categories,
        recommended: item.recommended,
        status: item.status,
        to_do_priority: item.to_do_priority,
      },
      {
        onConflict: 'idea_title', // Specify the unique key column
      },
    );

    if (error) {
      console.error(error)
      console.error('Upsert error:', error);
    } else {
      console.log('Upserted:', item.idea_title);
    }
  }
};

// Main function to load data and perform upsert
const main = async () => {
  const data = loadData();
  await upsertData(data);
};

main();
