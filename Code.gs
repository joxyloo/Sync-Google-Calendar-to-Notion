function myFunction() {

}

var scriptProperties = PropertiesService.getScriptProperties();
const notionApiToken = scriptProperties.getProperty('notionApiToken');
const databaseId = scriptProperties.getProperty('databaseId');
const calendarId = scriptProperties.getProperty('calendarId');

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

async function addCalendarEventsToNotion() {
  
  // Fetch events from Google Calendar
  const events = CalendarApp.getCalendarById(calendarId).getEventsForDay(today);

  console.log(events);

  // create a new journal entry in Notion if has event 
  if (events.length > 0) {
    const pageId = await createNewJournalEntry(transformToNotionDate(events[0].getStartTime()));
    await addEventsToJournal(pageId, events);
  }

}

async function queryDatabase(databaseId) {
  const options = {
    method: "post",
    headers: {
      "Authorization": `Bearer ${notionApiToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    payload: JSON.stringify({
      "filter": {
        "property": "Date",
        "date": {
          "equals": transformToNotionDate(yesterday)
        }
      }
    })
  };
  
  const res = UrlFetchApp.fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, options);
  const resObj = JSON.parse(res.getContentText());
  return resObj.results[0].id;
}

function transformToNotionDate(date) {
  return date.toISOString().split('T')[0];
}

async function createNewJournalEntry(date) {
  console.log(date);
  const options = {
    method: "post",
    headers: {
      "Authorization": `Bearer ${notionApiToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    payload: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        "Name": { title: [{ text: { content: "Journal" } }] },
        "Date": { date: { start: date } }
      }
    })
  };
  
  const res = UrlFetchApp.fetch("https://api.notion.com/v1/pages", options);
  const resObj = JSON.parse(res.getContentText());
  return resObj.id; // return page ID
}

async function addEventsToJournal(pageId, events) {
  let multiSelectArray = []

  for(i=0; i<events.length; i++) {
    console.log(events[i].getTitle());
    multiSelectArray.push({"name": events[i].getTitle()})
  }

  const options = {
    method: 'patch',
    headers: {
      'Authorization': `Bearer ${notionApiToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    payload: JSON.stringify({
      "properties": {
        "Activity": {
          "multi_select": multiSelectArray
        }
      }
    })
  };
  
  UrlFetchApp.fetch(`https://api.notion.com/v1/pages/${pageId}`, options);

}

