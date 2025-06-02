// // run in browser on organizers/following page

// const scrapeOrganizers = () => {
//   const organizers = [];

//   const organizerElements = document.querySelectorAll(
//     "#profile-following .following-section__item",
//   );

//   organizerElements.forEach((element) => {
//     const nameElement = element.querySelector(".following-section__item-link");
//     const name = nameElement.textContent.trim();
//     const url = nameElement.href;

//     organizers.push({ name, url });
//   });

//   // Optionally, you can save the data to a JSON file if you have a server-side environment.
//   // Here, we're just returning the data.
//   return organizers;
// };

// // Run the function
// scrapeOrganizers();
