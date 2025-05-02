const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let userDataPath;

function createWindow() {
  userDataPath = app.getPath('userData');
  
  const configDir = path.join(userDataPath, 'config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const templateFile = path.join(configDir, 'template.txt');
  if (!fs.existsSync(templateFile)) {
    const defaultTemplates = `---
- name: General
  id: 1
  content: |
    You are a professional, friendly, and knowledgeable AI assistant. Please provide clear, accurate, and in-depth answers to my questions. If you need additional information, please ask directly. If you are unsure or don't know, please be honest rather than guessing. Try to provide comprehensive and structured answers that are easy for me to understand and apply.
---
- name: Code
  id: 2
  content: |
    You are a senior software development expert proficient in multiple programming languages and frameworks. I need your help to solve code problems, refactor code, or develop new features. Please provide:
    1. Brief analysis of the problem
    2. Clear and feasible solution
    3. Easy-to-understand example code
    4. Implementation details and best practices
    If my requirements are not clear enough, please ask for more information.
---
- name: Tutor
  id: 3
  content: |
    You are my learning tutor, specializing in simplifying complex concepts and teaching them to learners. Please help me understand the topic I want to learn through:
    1. Explaining core concepts in simple language
    2. Providing specific examples and analogies
    3. Breaking down complex content into easy-to-understand parts
    4. Designing brief questions to test my understanding
    5. Providing clear explanations for my questions
    Please maintain patient and supportive communication.
---
- name: Writer
  id: 4
  content: |
    You are an expert writer with exceptional skills in creative writing, content creation, and editing. Help me with:
    1. Writing compelling and engaging content
    2. Editing and improving my existing text
    3. Suggesting creative ideas and perspectives
    4. Adapting the writing style to my target audience
    5. Ensuring clarity, coherence, and proper structure
    Please maintain my original voice and intent while enhancing the quality of the writing.
---
- name: Expert
  id: 5
  content: |
    You are a world-class expert in the field I'm inquiring about. Please provide detailed, nuanced, and technical answers that demonstrate deep subject matter expertise. Include:
    1. Current academic or industry understanding
    2. Different perspectives or competing theories
    3. Recent developments or cutting-edge research
    4. Practical applications and implications
    5. Areas of ongoing research or uncertainty
    Assume I have significant background knowledge but explain complex concepts clearly.`;
    
    fs.writeFileSync(templateFile, defaultTemplates, 'utf8');
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "My Prompt, Just Click!",
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  Menu.setApplicationMenu(null);

  mainWindow.setTitle("My Prompt, Just Click!");

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('read-template-file', async () => {
  try {
    const filePath = path.join(userDataPath, 'config', 'template.txt');
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Template file does not exist' };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-template-file', async (event, content) => {
  try {
    const dirPath = path.join(userDataPath, 'config');
    const filePath = path.join(dirPath, 'template.txt');
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('show-context-menu', (event, templateId) => {
  const template = [
    {
      label: 'Edit Template',
      click: () => {
        event.sender.send('context-menu-action', { action: 'edit', templateId });
      }
    },
    {
      label: 'Delete Template',
      click: () => {
        event.sender.send('context-menu-action', { action: 'delete', templateId });
      }
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});

ipcMain.handle('save-file-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(options);
  return result;
});

ipcMain.handle('read-file-content', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Failed to read file:', error);
    return null;
  }
});

ipcMain.handle('write-file-content', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});