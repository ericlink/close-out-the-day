const mainDiv = document.querySelector('[role="main"]');
const rows = Array.from(mainDiv.querySelectorAll('tr[role="row"]'));

const urls = [];

async function clickRowsSequentially() {
  for (const [index, row] of rows.entries()) {
    row.click(); // click the row

    // Wait for navigation or URL update (adjust time if needed)
    await new Promise(resolve => setTimeout(resolve, 1000));

    urls.push(window.location.href);
    console.log(`Row ${index + 1}: ${window.location.href}`);
  }

  console.log('All captured URLs:', urls);
}

// Run the function
clickRowsSequentially();

