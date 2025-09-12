function log(text) {
  console.log(`close out the day: ${text}`);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'iconClicked') {
    log('Extension icon was clicked!');
    
    // Your script logic goes here
    handleIconClick(message.tabInfo);
    
    // Send response back to background script
    sendResponse({ success: true });
  }
});

function handleIconClick(tabInfo) {
  log(`Handling icon click on tab: ${tabInfo.url}`);
  
  // Add your main script logic here
  // This is where you can implement your Slack saved items and starred emails functionality
  
  // Example: You could check if we're on Slack and do specific actions
  if (window.location.hostname === 'app.slack.com') {
    log('Running on Slack - ready to collect saved items');
    // Your Slack-specific logic here
  }
}

log('loaded...');