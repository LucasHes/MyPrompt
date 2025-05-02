function insertText(text, cursorOffset = 0) {
    const textarea = document.getElementById('promptArea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = textarea.value;
    
    if (text.startsWith('```')) {
        text = '\n' + text;
    }
    
    textarea.value = content.substring(0, start) + text + content.substring(end);
    
    const newPosition = cursorOffset < 0 ?
        start + text.length + cursorOffset :
        start + text.length;
    textarea.setSelectionRange(newPosition, newPosition);
    textarea.focus();
}

function insertNumberedList() {
    const textarea = document.getElementById('promptArea');
    const start = textarea.selectionStart;
    const content = textarea.value;
    
    const text = "1. \n2. \n3. \n";
    textarea.value = content.substring(0, start) + text + content.substring(start);
    
    const newPosition = start + 3;
    textarea.setSelectionRange(newPosition, newPosition);
    textarea.focus();
}

function insertUnorderedList() {
    const textarea = document.getElementById('promptArea');
    const start = textarea.selectionStart;
    const content = textarea.value;
    
    const text = "- \n- \n- \n";
    textarea.value = content.substring(0, start) + text + content.substring(start);
    
    const newPosition = start + 2;
    textarea.setSelectionRange(newPosition, newPosition);
    textarea.focus();
}

function copyText() {
    const textarea = document.getElementById('promptArea');
    textarea.select();
    document.execCommand('copy');
    setTimeout(() => {
        textarea.focus();
    }, 100);
}

function clearText() {
    document.getElementById('promptArea').value = '';
    setTimeout(() => {
        document.getElementById('promptArea').focus();
    }, 100);
}

let deleteTemplateId = null;
let editTemplateId = null;

window.onload = function() {
    loadTemplatesFromFile();
};

function saveTemplate() {
    saveTemplateToFile();
}

function loadTemplatesFromFile() {
    if (window.electronAPI) {
        window.electronAPI.readTemplateFile()
            .then(result => {
                if (result.success) {
                    const templates = parseTemplates(result.content);
                    renderTemplateButtons(templates);
                } else {
                    showMessage('Failed to read template file: ' + result.error, true);
                }
            });
    } else {
        fetch('config/template.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load templates');
                }
                return response.text();
            })
            .then(content => {
                const templates = parseTemplates(content);
                renderTemplateButtons(templates);
            })
            .catch(error => {
                showMessage('Failed to load templates: ' + error.message, true);
            });
    }
}

function parseTemplates(content) {
    if (!content || typeof content !== 'string') {
        console.warn('无效的模板内容:', content);
        return [];
    }
    
    try {
        const templates = [];
        const sections = content.split('---').filter(section => section.trim());
        
        sections.forEach(section => {
            try {
                const lines = section.trim().split('\n');
                let template = {};
                let inContent = false;
                let contentLines = [];
                let contentIndent = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const trimmedLine = line.trim();
                    
                    if (trimmedLine.startsWith('- name:')) {
                        template.name = trimmedLine.substring('- name:'.length).trim();
                    } else if (trimmedLine.startsWith('id:')) {
                        template.id = trimmedLine.substring('id:'.length).trim();
                    } else if (trimmedLine.startsWith('content:')) {
                        inContent = true;
                    } else if (inContent) {
                        if (trimmedLine === '|') {
                            continue;
                        }
                        
                        if (contentLines.length === 0) {
                            contentIndent = line.search(/\S|$/);
                        }
                        
                        if (contentIndent > 0 && line.startsWith(' '.repeat(contentIndent))) {
                            contentLines.push(line.substring(contentIndent));
                        } else {
                            contentLines.push(line);
                        }
                    }
                }
                
                if (template.name && template.id && contentLines.length > 0) {
                    while (contentLines.length > 0 && contentLines[contentLines.length - 1].trim() === '') {
                        contentLines.pop();
                    }
                    
                    template.content = contentLines.join('\n');
                    templates.push(template);
                } else {
                    console.warn('跳过无效模板:', template);
                }
            } catch (err) {
                console.error('解析模板部分时出错:', err);
            }
        });
        
        return templates;
    } catch (error) {
        console.error('解析模板失败:', error);
        return [];
    }
}

function saveTemplateToFile() {
    const name = document.getElementById('templateName').value.trim();
    const content = document.getElementById('templateContent').value.trim();
    
    if (!name || !content) {
        showMessage('Template name and content cannot be empty', true);
        return;
    }

    if (content.length > 2000) {
        showMessage('Template content cannot exceed 2000 characters', true);
        return;
    }
    
    if (window.electronAPI) {
        window.electronAPI.readTemplateFile()
            .then(result => {
                if (result.success) {
                    processTemplateData(result.content);
                } else {
                    processTemplateData('');
                }
            });
    } else {
        fetch('config/template.txt')
            .then(response => {
                if (!response.ok) {
                    return '';
                }
                return response.text();
            })
            .then(content => {
                processTemplateData(content);
            })
            .catch(() => {
                processTemplateData('');
            });
    }
    
    function processTemplateData(fileContent) {
        const templates = parseTemplates(fileContent);
        
        if (templates.length >= 15) {
            showMessage('Template limit reached (15), please delete some templates before adding more', true);
            return;
        }
        
        let maxId = 0;
        templates.forEach(template => {
            const id = parseInt(template.id);
            if (!isNaN(id) && id > maxId) {
                maxId = id;
            }
        });
        
        const newTemplate = {
            name: name,
            id: (maxId + 1).toString(),
            content: content
        };
        
        templates.push(newTemplate);
        
        const newFileContent = generateTemplateFileContent(templates);
        
        if (window.electronAPI) {
            window.electronAPI.writeTemplateFile(newFileContent)
                .then(result => {
                    if (result.success) {
                        showMessage('Template saved');
                        clearTemplateForm();
                        renderTemplateButtons(templates);
                    } else {
                        showMessage('Failed to save template: ' + result.error, true);
                    }
                });
        } else {
            showMessage('Template saved (cannot actually save file in browser environment)');
            clearTemplateForm();
            renderTemplateButtons(templates);
        }
    }
    
    function clearTemplateForm() {
        document.getElementById('templateName').value = '';
        document.getElementById('templateContent').value = '';
        
        setTimeout(() => {
            document.getElementById('templateName').focus();
        }, 100);
    }
}

function generateTemplateFileContent(templates) {
    let content = '';
    const INDENT = '    ';
    
    templates.forEach(template => {
        content += '---\n';
        content += `- name: ${template.name}\n`;
        content += `  id: ${template.id}\n`;
        content += '  content: |\n';
        
        const contentLines = template.content.split('\n');
        contentLines.forEach(line => {
            content += `${INDENT}${line}\n`;
        });
    });
    
    return content;
}

function renderTemplateButtons(templates = []) {
    const container = document.getElementById('template-buttons-container');
    
    container.innerHTML = '';
    
    templates.forEach(template => {
        const button = document.createElement('button');
        button.className = 'template-button-toolbar';
        button.textContent = template.name;
        button.dataset.templateId = template.id;
        button.onclick = () => {
            const promptArea = document.getElementById('promptArea');
            promptArea.value = template.content;
            promptArea.focus();
        };
        
        if (window.electronAPI) {
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                window.electronAPI.showContextMenu(template.id);
            });
        }
        
        container.appendChild(button);
    });
}

function openDeleteModal(templateId) {
    console.log('打开删除模态框, 模板ID:', templateId);
    
    if (!templateId) {
        console.error('未提供有效的模板ID');
        return;
    }
    
    deleteTemplateId = templateId;
    const modal = document.getElementById('delete-confirm-modal');
    modal.classList.add('active');
}

function confirmDeleteTemplate() {
    console.log("确认删除模板ID:", deleteTemplateId);
    
    if (!deleteTemplateId) {
        console.error("没有要删除的模板ID");
        showMessage('Template not found for deletion', true);
        return;
    }
    
    if (window.electronAPI) {
        window.electronAPI.readTemplateFile()
            .then(result => {
                if (result.success) {
                    deleteTemplateFromData(result.content, deleteTemplateId);
                } else {
                    showMessage('Failed to read template file: ' + result.error, true);
                }
            });
    } else {
        fetch('config/template.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('无法读取模板文件');
                }
                return response.text();
            })
            .then(fileContent => {
                deleteTemplateFromData(fileContent, deleteTemplateId);
            })
            .catch(error => {
                showMessage('Failed to load templates: ' + error.message, true);
            });
    }
    
    closeModal('delete-confirm-modal');
}

function deleteTemplateFromData(fileContent, templateId) {
    console.log("开始删除模板, 模板ID:", templateId);
    
    if (!templateId) {
        console.error("没有要删除的模板ID");
        return;
    }
    
    const templates = parseTemplates(fileContent);
    console.log("解析到的模板数量:", templates.length);
    
    const templateExists = templates.some(t => t.id === templateId);
    if (!templateExists) {
        console.error("未找到ID为", templateId, "的模板");
        showMessage('Template not found for deletion', true);
        return;
    }
    
    const updatedTemplates = templates.filter(template => template.id !== templateId);
    console.log("过滤后的模板数量:", updatedTemplates.length);
    
    const newFileContent = generateTemplateFileContent(updatedTemplates);
    
    if (window.electronAPI) {
        window.electronAPI.writeTemplateFile(newFileContent)
            .then(result => {
                if (result.success) {
                    showMessage('Template deleted');
                    renderTemplateButtons(updatedTemplates);
                } else {
                    showMessage('Failed to delete template: ' + result.error, true);
                }
            });
    } else {
        showMessage('Template deleted (cannot actually save file in browser environment)');
        renderTemplateButtons(updatedTemplates);
    }
    
    deleteTemplateId = null;
}

function openEditModal(template) {
    console.log("打开编辑模态框, 模板:", template);
    
    if (!template || !template.id) {
        console.error('无效的模板数据');
        return;
    }
    
    document.getElementById('edit-template-name').value = template.name;
    document.getElementById('edit-template-content').value = template.content;
    document.getElementById('edit-template-id').value = template.id;
    
    editTemplateId = template.id;
    
    const modal = document.getElementById('edit-template-modal');
    modal.classList.add('active');
    
    setTimeout(() => {
        document.getElementById('edit-template-name').focus();
    }, 100);
}

function updateTemplate() {
    const name = document.getElementById('edit-template-name').value.trim();
    const content = document.getElementById('edit-template-content').value.trim();
    const templateId = document.getElementById('edit-template-id').value;
    
    console.log("更新模板 - 名称:", name, "ID:", templateId);
    
    if (!templateId) {
        console.error('无效的模板ID');
        showMessage('Invalid template ID', true);
        return;
    }
    
    if (!name || !content) {
        showMessage('Template name and content cannot be empty', true);
        return;
    }

    if (content.length > 2000) {
        showMessage('Template content cannot exceed 2000 characters', true);
        return;
    }
    
    if (window.electronAPI) {
        window.electronAPI.readTemplateFile()
            .then(result => {
                if (result.success) {
                    updateTemplateInData(result.content, templateId, name, content);
                } else {
                    showMessage('Failed to read template file: ' + result.error, true);
                }
            });
    } else {
        fetch('config/template.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('无法读取模板文件');
                }
                return response.text();
            })
            .then(fileContent => {
                updateTemplateInData(fileContent, templateId, name, content);
            })
            .catch(error => {
                showMessage('Failed to load templates: ' + error.message, true);
            });
    }
    
    closeModal('edit-template-modal');
}

function updateTemplateInData(fileContent, templateId, newName, newContent) {
    console.log("开始更新模板, ID:", templateId);
    
    const templates = parseTemplates(fileContent);
    
    const updatedTemplates = templates.map(template => {
        if (template.id === templateId) {
            console.log("找到要更新的模板:", template.name);
            return {
                ...template,
                name: newName,
                content: newContent
            };
        }
        return template;
    });
    
    const newFileContent = generateTemplateFileContent(updatedTemplates);
    
    if (window.electronAPI) {
        window.electronAPI.writeTemplateFile(newFileContent)
            .then(result => {
                if (result.success) {
                    showMessage('Template updated');
                    renderTemplateButtons(updatedTemplates);
                } else {
                    showMessage('Failed to update template: ' + result.error, true);
                }
            });
    } else {
        showMessage('Template updated (cannot actually save file in browser environment)');
        renderTemplateButtons(updatedTemplates);
    }
    
    editTemplateId = null;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

function showMessage(message, isError = false) {
    let messageElement = document.getElementById('temp-message');
    
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'temp-message';
        messageElement.style.position = 'fixed';
        messageElement.style.top = '20px';
        messageElement.style.left = '50%';
        messageElement.style.transform = 'translateX(-50%)';
        messageElement.style.padding = '10px 20px';
        messageElement.style.borderRadius = '4px';
        messageElement.style.fontSize = '16px';
        messageElement.style.fontWeight = 'bold';
        messageElement.style.zIndex = '1000';
        messageElement.style.transition = 'opacity 0.5s';
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.style.backgroundColor = isError ? '#ff3366' : '#0066ff';
    messageElement.style.color = '#ffffff';
    messageElement.style.opacity = '1';
    
    setTimeout(() => {
        messageElement.style.opacity = '0';
    }, 2000);
}

function importTemplates() {
    if (window.electronAPI) {
        window.electronAPI.openFileDialog({
            title: '选择模板文件',
            buttonLabel: '导入',
            filters: [
                { name: '文本文件', extensions: ['txt'] }
            ],
            properties: ['openFile']
        }).then(result => {
            if (result.canceled) {
                console.log('用户取消了导入');
                return;
            }
            
            const filePath = result.filePaths[0];
            console.log('选择的文件:', filePath);
            
            window.electronAPI.readFileContent(filePath)
                .then(content => {
                    if (content) {
                        window.importContent = content;
                        
                        const modal = document.getElementById('import-confirm-modal');
                        modal.classList.add('active');
                    } else {
                        showMessage('Cannot read the selected file', true);
                    }
                });
        });
    } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    window.importContent = e.target.result;
                    
                    const modal = document.getElementById('import-confirm-modal');
                    modal.classList.add('active');
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }
}

function confirmImportTemplates() {
    if (!window.importContent) {
        showMessage('No content to import', true);
        closeModal('import-confirm-modal');
        return;
    }
    
    try {
        const templates = parseTemplates(window.importContent);
        if (templates.length === 0) {
            showMessage('The imported file does not contain valid templates', true);
            closeModal('import-confirm-modal');
            return;
        }
        
        if (window.electronAPI) {
            window.electronAPI.writeTemplateFile(window.importContent)
                .then(result => {
                    if (result.success) {
                        showMessage(`Successfully imported ${templates.length} templates`);
                        renderTemplateButtons(templates);
                    } else {
                        showMessage('Failed to import templates: ' + result.error, true);
                    }
                });
        } else {
            showMessage(`Successfully imported ${templates.length} templates (cannot actually save file in browser environment)`);
            renderTemplateButtons(templates);
        }
    } catch (error) {
        showMessage('Incorrect format in imported file', true);
        console.error('解析导入内容时出错:', error);
    }
    
    window.importContent = null;
    closeModal('import-confirm-modal');
}

function exportTemplates() {
    if (window.electronAPI) {
        window.electronAPI.readTemplateFile()
            .then(result => {
                if (!result.success) {
                    showMessage('Failed to read template file: ' + result.error, true);
                    return;
                }
                
                window.electronAPI.saveFileDialog({
                    title: '导出模板',
                    buttonLabel: '导出',
                    defaultPath: 'templates.txt',
                    filters: [
                        { name: '文本文件', extensions: ['txt'] }
                    ]
                }).then(saveResult => {
                    if (saveResult.canceled) {
                        console.log('用户取消了导出');
                        return;
                    }
                    
                    const savePath = saveResult.filePath;
                    console.log('保存路径:', savePath);
                    
                    window.electronAPI.writeFileContent(savePath, result.content)
                        .then(writeResult => {
                            if (writeResult.success) {
                                showMessage('Templates exported successfully');
                            } else {
                                showMessage('Failed to export templates: ' + writeResult.error, true);
                            }
                        });
                });
            });
    } else {
        fetch('config/template.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('无法读取模板文件');
                }
                return response.text();
            })
            .then(content => {
                const blob = new Blob([content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = 'templates.txt';
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 0);
                
                showMessage('Templates exported');
            })
            .catch(error => {
                showMessage('Failed to export templates: ' + error.message, true);
            });
    }
}

function openGuide() {
    const guideContent = document.querySelector('#guide-modal .guide-content');
    
    guideContent.innerHTML = `
        <div class="guide-section">
            <h4>Welcome to MyPrompt Editor</h4>
            <p>This is a tool to help you manage and edit AI prompts, allowing you to save, edit, and organize your frequently used prompt templates.</p>
        </div>
        
        <div class="guide-section">
            <h4>Basic Features</h4>
            <ul>
                <li><strong>Editing Area</strong>: The large text box in the center is your main editing area where you can write and edit prompts.</li>
                <li><strong>Formatting Tools</strong>: Use the "Divider", "Code Block", "Quote" and other buttons to quickly insert common formats.</li>
                <li><strong>Copy/Clear</strong>: Quickly copy content or clear the editing area.</li>
            </ul>
        </div>
        
        <div class="guide-section">
            <h4>Custom Templates</h4>
            <p>The right panel allows you to create and save custom templates:</p>
            <ul>
                <li>Enter a template name (max 6 characters) and content (max 600 characters)</li>
                <li>Click "Save as Template" and the template will appear in the green button area at the top</li>
                <li>Click a green template button to quickly load that template content</li>
                <li>Right-click a template button to edit or delete the template</li>
                <li>You can create up to 15 custom templates</li>
            </ul>
        </div>
        
        <div class="guide-section">
            <h4>Import/Export Templates</h4>
            <p>You can back up and restore your templates using the import/export buttons at the top:</p>
            <ul>
                <li><strong>Import Templates</strong>: Import a template collection from an external file (will overwrite current templates)</li>
                <li><strong>Export Templates</strong>: Export your current template collection to a file for backup or sharing</li>
            </ul>
        </div>
        
        <div class="guide-section">
            <h4>Prompt Writing Tips</h4>
            <p>Writing effective AI prompts can help you get better results:</p>
            <ul>
                <li>Use clear, specific instructions</li>
                <li>Clearly state your expectations and limitations</li>
                <li>Provide appropriate context information</li>
                <li>Specify output format and style</li>
                <li>For complex tasks, break down big tasks into smaller steps</li>
            </ul>
        </div>
    `;
    
    const modal = document.getElementById('guide-modal');
    modal.classList.add('active');
}

function openAbout() {
    const modal = document.getElementById('about-modal');
    modal.classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.electronAPI) {
        window.electronAPI.onContextMenuAction((event, data) => {
            console.log('收到右键菜单动作:', data);
            
            window.electronAPI.readTemplateFile().then(result => {
                if (result.success) {
                    const templates = parseTemplates(result.content);
                    const template = templates.find(t => t.id === data.templateId);
                    
                    if (template) {
                        if (data.action === 'edit') {
                            openEditModal(template);
                        } else if (data.action === 'delete') {
                            openDeleteModal(data.templateId);
                        }
                    } else {
                        console.error('未找到ID为', data.templateId, '的模板');
                    }
                }
            });
        });
    }
    
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('click', function() {
            this.focus();
        });
    });
});