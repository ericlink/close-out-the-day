// Background script
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`windowId: ${activeInfo.windowId} tabId:${activeInfo.tabId}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`message: ${message} sender: ${sender} sendResponse: ${sendResponse}`);
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked!', tab);
  
  // Send message to content script on the current tab
  chrome.tabs.sendMessage(tab.id, {
    action: 'iconClicked',
    tabInfo: tab
  }).catch(err => {
    console.log('Could not send message to content script:', err);
  });
});

console.log(`close out the day: loaded.`)
