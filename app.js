const csvFilesInput = document.getElementById('csvFiles');
const dropZone = document.getElementById('dropZone');
const fileListContainer = document.getElementById('fileListContainer');
const fileList = document.getElementById('fileList');
const clearAllBtn = document.getElementById('clearAllBtn');
const convertBtn = document.getElementById('convertBtn');
const convertBtnText = document.getElementById('convertBtnText');
const resultArea = document.getElementById('resultArea');
const downloadList = document.getElementById('downloadList');
const globalStats = document.getElementById('globalStats');
const hideEmptyValuesCheckbox = document.getElementById('hideEmptyValues');

let selectedFiles = [];
let fileSettings = []; // { columns: [{name, included, isTitle}], originalColumns: [], previewData: [], expanded: false }
let convertedFiles = [];

/**
 * Détecte l'encodage et décode le fichier en UTF-8
 * Simple et efficace : utilise TextDecoder natif du navigateur
 */
function readFileAsUtf8(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            const bytes = new Uint8Array(e.target.result);

            // Détecter l'encodage via BOM ou heuristique
            const { encoding, offset, name } = detectEncoding(bytes);

            // Décoder avec TextDecoder natif
            const decoder = new TextDecoder(encoding);
            const content = decoder.decode(bytes.slice(offset));

            resolve({ content, encoding: name });
        };

        reader.onerror = () => reject(new Error('Erreur de lecture'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Détecte l'encodage : BOM ou heuristique simple
 */
function detectEncoding(bytes) {
    // UTF-8 BOM
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return { encoding: 'utf-8', offset: 3, name: 'UTF-8 BOM' };
    }
    // UTF-16 LE BOM
    if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        return { encoding: 'utf-16le', offset: 2, name: 'UTF-16 LE' };
    }
    // UTF-16 BE BOM
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
        return { encoding: 'utf-16be', offset: 2, name: 'UTF-16 BE' };
    }

    // Pas de BOM : détecter Windows-1252 vs UTF-8
    // Les octets 0x80-0x9F sont valides en Windows-1252 mais invalides en UTF-8
    for (let i = 0; i < Math.min(bytes.length, 5000); i++) {
        if (bytes[i] >= 0x80 && bytes[i] <= 0x9F) {
            return { encoding: 'windows-1252', offset: 0, name: 'Windows-1252' };
        }
    }

    return { encoding: 'utf-8', offset: 0, name: 'UTF-8' };
}

// Gestion du drag & drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'));
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'));
});

dropZone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    if (files.length) addFiles(files);
});

csvFilesInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length) addFiles(files);
});

async function addFiles(files) {
    for (const file of files) {
        const { columns, previewData } = await parseFileWithPreview(file);
        selectedFiles.push(file);
        fileSettings.push({
            columns: columns.map((name, idx) => ({
                name,
                included: true,
                isTitle: idx === 0 // Première colonne = titre par défaut
            })),
            originalColumns: columns,
            previewData: previewData,
            expanded: false
        });
    }
    updateFileList();
    resultArea.classList.add('hidden');
}

async function parseFileWithPreview(file) {
    const { content } = await readFileAsUtf8(file);
    return new Promise((resolve) => {
        Papa.parse(content, {
            header: true,
            preview: 5, // Header + 4 rows
            delimitersToGuess: [';', ',', '\t', '|'],
            complete: (results) => {
                resolve({
                    columns: results.meta.fields || [],
                    previewData: results.data.slice(0, 4) // First 4 entries
                });
            },
            error: () => resolve({ columns: [], previewData: [] })
        });
    });
}

function updateFileList() {
    fileList.innerHTML = '';

    if (selectedFiles.length === 0) {
        fileListContainer.classList.add('hidden');
        convertBtn.disabled = true;
        convertBtnText.textContent = 'Convertir en Markdown';
        return;
    }

    fileListContainer.classList.remove('hidden');
    convertBtn.disabled = false;
    convertBtnText.textContent = `Convertir ${selectedFiles.length} fichier${selectedFiles.length > 1 ? 's' : ''}`;

    selectedFiles.forEach((file, index) => {
        const settings = fileSettings[index];
        const includedCount = settings.columns.filter(c => c.included).length;
        const titleCount = settings.columns.filter(c => c.isTitle).length;
        const totalCount = settings.columns.length;

        const fileItem = document.createElement('div');
        fileItem.className = 'file-item flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden';
        fileItem.style.animation = 'slideIn 0.3s ease-out';
        fileItem.innerHTML = `
            <div class="flex items-center gap-3 p-4">
                <svg class="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-700 truncate">${file.name}</p>
                    <p class="text-xs text-gray-500">${formatFileSize(file.size)} • ${totalCount} colonnes</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full">${includedCount}/${totalCount} col.</span>
                    <span class="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full">${titleCount} titre${titleCount > 1 ? 's' : ''}</span>
                </div>
                <button onclick="removeFile(${index})" class="btn-delete text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 flex-shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- Toggle button -->
            <div class="border-t border-gray-100">
                <button onclick="toggleFileConfig(${index})" class="flex items-center gap-2 px-4 py-2.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50/50 transition-all w-full group">
                    <svg class="w-4 h-4 transition-transform duration-200 ${settings.expanded ? 'rotate-180' : ''}" id="chevron-${index}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                    <span id="toggle-text-${index}" class="font-medium">${settings.expanded ? 'Masquer' : 'Afficher configuration'}</span>
                </button>
            </div>

            <!-- Collapsible section -->
            <div id="config-section-${index}" class="config-panel ${settings.expanded ? '' : 'hidden'}">
                <!-- Two column layout -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-0">
                    <!-- Column config section -->
                    <div class="p-4 border-t border-gray-200 lg:border-r">
                        <h4 class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
                            </svg>
                            Colonnes
                            <span class="ml-auto text-xs font-normal text-gray-500">${includedCount} sur ${totalCount}</span>
                        </h4>
                        <div id="column-list-${index}" class="space-y-1.5">
                            ${generateColumnListHTML(index, settings)}
                        </div>
                    </div>

                    <!-- Preview section -->
                    <div class="p-4 bg-gradient-to-br from-slate-50 to-gray-50 border-t border-gray-200">
                        <h4 class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                            Aperçu Markdown
                            <span class="ml-auto text-xs font-normal text-gray-500">${settings.previewData.length} entrées</span>
                        </h4>
                        <div id="preview-container-${index}">
                            ${generatePreviewHTML(settings)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        fileList.appendChild(fileItem);
    });
}

function toggleFileConfig(index) {
    const isExpanded = fileSettings[index].expanded;
    fileSettings[index].expanded = !isExpanded;

    const section = document.getElementById(`config-section-${index}`);
    const chevron = document.getElementById(`chevron-${index}`);
    const toggleText = document.getElementById(`toggle-text-${index}`);

    if (isExpanded) {
        section.classList.add('hidden');
        chevron.classList.remove('rotate-180');
        toggleText.textContent = 'Afficher configuration';
    } else {
        section.classList.remove('hidden');
        chevron.classList.add('rotate-180');
        toggleText.textContent = 'Masquer';
        // Initialize Sortable when expanding
        initSortable(index);
    }
}

function generatePreviewHTML(settings) {
    if (!settings.previewData || settings.previewData.length === 0) {
        return '<p class="text-sm text-gray-400 italic text-center py-4">Aucune donnée à prévisualiser</p>';
    }

    const hideEmpty = hideEmptyValuesCheckbox.checked;
    const rawMarkdown = generateRawMarkdownPreview(settings, hideEmpty);

    return `
        <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">${escapeHtml(rawMarkdown)}</pre>
    `;
}

function generateRawMarkdownPreview(settings, hideEmpty) {
    const titleColumns = settings.columns.filter(c => c.isTitle && c.included);
    const bodyColumns = settings.columns.filter(c => !c.isTitle && c.included);

    const entries = settings.previewData.map(row => {
        const titleParts = titleColumns.map(col => row[col.name] || 'Inconnu');
        let md = titleParts.length > 0 ? `# ${titleParts.join(' - ')}\n` : '';

        bodyColumns.forEach(col => {
            const value = String(row[col.name] || '').trim();
            if (hideEmpty && !value) return;
            md += `**${col.name} :** ${value}\n`;
        });

        return md;
    });

    return entries.join('\n---\n\n');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateColumnListHTML(fileIndex, settings) {
    return settings.columns.map((col, colIndex) => `
        <div class="column-config-item flex items-center gap-2 p-2.5 rounded-lg border transition-all ${col.isTitle ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'} ${!col.included ? 'opacity-40' : ''}"
             data-col-index="${colIndex}">
            <div class="drag-handle cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 p-1 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
                </svg>
                <span class="column-number w-6 h-6 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full text-xs font-bold">${colIndex + 1}</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-700 truncate">${col.name}</p>
            </div>
            <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" ${col.included ? 'checked' : ''} onchange="toggleColumnIncluded(${fileIndex}, ${colIndex})" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer">
                <span class="text-xs text-gray-500">Inclure</span>
            </label>
            <label class="inline-flex items-center gap-1.5 cursor-pointer select-none px-2 py-1 rounded-md ${col.isTitle ? 'bg-purple-100' : 'hover:bg-gray-100'}">
                <input type="checkbox" ${col.isTitle ? 'checked' : ''} onchange="toggleColumnTitle(${fileIndex}, ${colIndex})" class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer">
                <span class="text-xs ${col.isTitle ? 'text-purple-700 font-medium' : 'text-gray-500'}">Titre</span>
            </label>
        </div>
    `).join('');
}

// Sortable instances storage
let sortableInstances = {};

function initSortable(fileIndex) {
    const columnList = document.getElementById(`column-list-${fileIndex}`);
    if (!columnList) return;

    // Destroy existing instance if any
    if (sortableInstances[fileIndex]) {
        sortableInstances[fileIndex].destroy();
    }

    sortableInstances[fileIndex] = new Sortable(columnList, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: function(evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;

            if (oldIndex === newIndex) return;

            // Reorder columns in data
            const columns = fileSettings[fileIndex].columns;
            const [movedColumn] = columns.splice(oldIndex, 1);
            columns.splice(newIndex, 0, movedColumn);

            // Update numbers and preview
            updateColumnNumbers(fileIndex);
            updatePreview(fileIndex);
            updateBadges(fileIndex);
        }
    });
}

function updateColumnNumbers(fileIndex) {
    const columnList = document.getElementById(`column-list-${fileIndex}`);
    if (!columnList) return;

    const items = columnList.querySelectorAll('.column-config-item');
    items.forEach((item, index) => {
        const numberEl = item.querySelector('.column-number');
        if (numberEl) {
            numberEl.textContent = index + 1;
        }
        item.dataset.colIndex = index;

        // Update checkbox handlers
        const checkboxes = item.querySelectorAll('input[type="checkbox"]');
        if (checkboxes[0]) {
            checkboxes[0].setAttribute('onchange', `toggleColumnIncluded(${fileIndex}, ${index})`);
        }
        if (checkboxes[1]) {
            checkboxes[1].setAttribute('onchange', `toggleColumnTitle(${fileIndex}, ${index})`);
        }
    });
}

function updatePreview(fileIndex) {
    const previewContainer = document.getElementById(`preview-container-${fileIndex}`);
    if (previewContainer) {
        previewContainer.innerHTML = generatePreviewHTML(fileSettings[fileIndex]);
    }
}

function updateBadges(fileIndex) {
    const settings = fileSettings[fileIndex];
    const includedCount = settings.columns.filter(c => c.included).length;
    const titleCount = settings.columns.filter(c => c.isTitle).length;
    const totalCount = settings.columns.length;

    const columnListEl = document.getElementById(`column-list-${fileIndex}`);
    const fileItem = columnListEl?.closest('.file-item');
    if (fileItem) {
        const badges = fileItem.querySelectorAll('.flex.items-center.gap-2 span');
        if (badges.length >= 2) {
            badges[0].textContent = `${includedCount}/${totalCount} col.`;
            badges[1].textContent = `${titleCount} titre${titleCount > 1 ? 's' : ''}`;
        }
    }
}

function toggleColumnIncluded(fileIndex, colIndex) {
    const col = fileSettings[fileIndex].columns[colIndex];
    col.included = !col.included;
    if (!col.included && col.isTitle) {
        col.isTitle = false;
    }
    updateFileConfigSection(fileIndex);
}

function toggleColumnTitle(fileIndex, colIndex) {
    const col = fileSettings[fileIndex].columns[colIndex];
    col.isTitle = !col.isTitle;
    if (col.isTitle) {
        col.included = true;
    }
    updateFileConfigSection(fileIndex);
}

function updateFileConfigSection(fileIndex) {
    const settings = fileSettings[fileIndex];

    // Update column list
    const columnListEl = document.getElementById(`column-list-${fileIndex}`);
    if (columnListEl) {
        columnListEl.innerHTML = generateColumnListHTML(fileIndex, settings);
        // Reinitialize Sortable
        initSortable(fileIndex);
    }

    // Update preview
    updatePreview(fileIndex);

    // Update badges
    updateBadges(fileIndex);
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    fileSettings.splice(index, 1);
    updateFileList();
}

clearAllBtn.addEventListener('click', () => {
    selectedFiles = [];
    fileSettings = [];
    updateFileList();
    csvFilesInput.value = '';
});

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatNumber(num) {
    return num.toLocaleString('fr-FR');
}

function generateOutputFilename(inputFilename) {
    return inputFilename.replace(/\.csv$/i, '_markdown.md');
}

function getDelimiterName(delimiter) {
    const map = { ',': 'Virgule', ';': 'Point-virgule', '\t': 'Tab', '|': 'Pipe' };
    return map[delimiter] || delimiter;
}

// Convertir les CSV
convertBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    convertBtn.disabled = true;
    convertBtnText.innerHTML = '<svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Conversion...';

    convertedFiles = [];
    const hideEmptyValues = hideEmptyValuesCheckbox.checked;

    for (let i = 0; i < selectedFiles.length; i++) {
        await convertFile(selectedFiles[i], fileSettings[i], hideEmptyValues);
    }

    displayResults();
    convertBtn.disabled = false;
    convertBtnText.textContent = `Convertir ${selectedFiles.length} fichier${selectedFiles.length > 1 ? 's' : ''}`;
});

async function convertFile(file, settings, hideEmptyValues) {
    // Lire et convertir en UTF-8
    const { content, encoding } = await readFileAsUtf8(file);

    return new Promise((resolve, reject) => {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            delimitersToGuess: [';', ',', '\t', '|'],
            complete: (results) => {
                const includedColumns = settings.columns.filter(c => c.included);
                const stats = {
                    totalRows: results.data.length,
                    columnCount: includedColumns.length,
                    delimiter: results.meta.delimiter,
                    emptyFieldsHidden: 0,
                    encoding: encoding
                };

                const markdownResult = convertToMarkdown(
                    results.data,
                    settings.columns,
                    hideEmptyValues,
                    stats
                );

                convertedFiles.push({
                    originalName: file.name,
                    outputName: generateOutputFilename(file.name),
                    content: markdownResult.content,
                    entryCount: results.data.length,
                    stats: stats,
                    outputSize: new Blob([markdownResult.content]).size,
                    characterCount: markdownResult.content.length
                });

                resolve();
            },
            error: reject
        });
    });
}

function convertToMarkdown(data, columns, hideEmptyValues = true, stats = {}) {
    if (!data || !data.length) return { content: '', stats };

    // Filtrer les colonnes incluses
    const includedColumns = columns.filter(c => c.included);
    const titleColumns = includedColumns.filter(c => c.isTitle);
    const bodyColumns = includedColumns.filter(c => !c.isTitle);

    const entries = data.map(row => {
        // Construire le titre avec les colonnes marquées comme titre
        const titleParts = titleColumns.map(col => row[col.name] || 'Inconnu');
        let md = titleParts.length > 0 ? `# ${titleParts.join(' - ')}\n` : '';

        // Ajouter les autres colonnes (non-titre)
        bodyColumns.forEach(col => {
            let value = String(row[col.name] || '').trim();

            if (hideEmptyValues && !value) {
                stats.emptyFieldsHidden++;
                return;
            }

            value = value.replace(/\s*\|\s*/g, ', ');
            md += `**${col.name} :** ${value}\n`;
        });

        return md;
    });

    return { content: entries.join('\n---\n\n'), stats };
}

function displayResults() {
    const totalEntries = convertedFiles.reduce((sum, f) => sum + f.entryCount, 0);
    const totalColumns = convertedFiles.reduce((sum, f) => sum + f.stats.columnCount, 0);
    const avgColumns = (totalColumns / convertedFiles.length).toFixed(1);
    const totalEmptyFieldsHidden = convertedFiles.reduce((sum, f) => sum + f.stats.emptyFieldsHidden, 0);
    const totalOutputSize = convertedFiles.reduce((sum, f) => sum + f.outputSize, 0);
    const totalCharacters = convertedFiles.reduce((sum, f) => sum + f.characterCount, 0);

    globalStats.innerHTML = `
        <h4 class="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            Statistiques globales
        </h4>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                <p class="text-gray-500 mb-1">Fichiers</p>
                <p class="text-lg font-bold text-gray-800">${convertedFiles.length}</p>
            </div>
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200">
                <p class="text-gray-500 mb-1">Entrées</p>
                <p class="text-lg font-bold text-gray-800">${totalEntries}</p>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                <p class="text-gray-500 mb-1">Colonnes</p>
                <p class="text-lg font-bold text-gray-800">${avgColumns}</p>
            </div>
            <div class="bg-gradient-to-br from-yellow-50 to-amber-50 p-3 rounded-lg border border-yellow-200">
                <p class="text-gray-500 mb-1">Caractères</p>
                <p class="text-lg font-bold text-gray-800">${formatNumber(totalCharacters)}</p>
            </div>
            <div class="bg-gradient-to-br from-orange-50 to-red-50 p-3 rounded-lg border border-orange-200">
                <p class="text-gray-500 mb-1">Taille</p>
                <p class="text-lg font-bold text-gray-800">${formatFileSize(totalOutputSize)}</p>
            </div>
        </div>
        ${totalEmptyFieldsHidden > 0 ? `
            <div class="mt-3 text-xs text-gray-600 flex items-center gap-2">
                <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>${formatNumber(totalEmptyFieldsHidden)} champs vides masqués</span>
            </div>
        ` : ''}
    `;

    downloadList.innerHTML = '';

    convertedFiles.forEach((file, index) => {
        const downloadItem = document.createElement('div');
        downloadItem.className = 'bg-white rounded-lg border border-green-200 animate-slide-in overflow-hidden';
        downloadItem.style.animationDelay = `${index * 0.1}s`;
        downloadItem.innerHTML = `
            <div class="p-4">
                <div class="flex items-center gap-2 mb-3 flex-wrap">
                    <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span class="text-xs text-gray-500">${file.originalName}</span>
                    <span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">${file.stats.encoding} → UTF-8</span>
                </div>

                <input
                    type="text"
                    value="${file.outputName}"
                    data-index="${index}"
                    class="filename-input w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent mb-3"
                >

                <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3 text-xs">
                    <div class="bg-gray-50 p-2 rounded">
                        <p class="text-gray-500">Entrées</p>
                        <p class="font-semibold text-gray-800">${file.entryCount}</p>
                    </div>
                    <div class="bg-gray-50 p-2 rounded">
                        <p class="text-gray-500">Colonnes</p>
                        <p class="font-semibold text-gray-800">${file.stats.columnCount}</p>
                    </div>
                    <div class="bg-gray-50 p-2 rounded">
                        <p class="text-gray-500">Délimiteur</p>
                        <p class="font-semibold text-gray-800">${getDelimiterName(file.stats.delimiter)}</p>
                    </div>
                    <div class="bg-gray-50 p-2 rounded">
                        <p class="text-gray-500">Caractères</p>
                        <p class="font-semibold text-gray-800">${formatNumber(file.characterCount)}</p>
                    </div>
                    <div class="bg-gray-50 p-2 rounded">
                        <p class="text-gray-500">Taille</p>
                        <p class="font-semibold text-gray-800">${formatFileSize(file.outputSize)}</p>
                    </div>
                </div>

                ${file.stats.emptyFieldsHidden > 0 ? `
                    <div class="mb-3 text-xs text-orange-600 flex items-center gap-2 bg-orange-50 p-2 rounded">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span>${formatNumber(file.stats.emptyFieldsHidden)} champs vides masqués</span>
                    </div>
                ` : ''}

                <div class="flex gap-2">
                    <button
                        onclick="copyToClipboard(${index})"
                        id="copyBtn-${index}"
                        class="btn-copy flex-1 text-white font-semibold py-2 px-4 rounded-lg shadow-md inline-flex items-center justify-center gap-2"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                        <span id="copyBtnText-${index}">Copier</span>
                    </button>
                    <button
                        onclick="downloadFile(${index})"
                        class="btn-success flex-1 text-white font-semibold py-2 px-4 rounded-lg shadow-md inline-flex items-center justify-center gap-2"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                        Télécharger
                    </button>
                </div>
            </div>
        `;
        downloadList.appendChild(downloadItem);
    });

    document.querySelectorAll('.filename-input').forEach(input => {
        input.addEventListener('change', (e) => {
            convertedFiles[parseInt(e.target.dataset.index)].outputName = e.target.value;
        });
    });

    resultArea.classList.remove('hidden');
}

async function copyToClipboard(index) {
    const file = convertedFiles[index];
    const btn = document.getElementById(`copyBtn-${index}`);
    const btnText = document.getElementById(`copyBtnText-${index}`);

    try {
        await navigator.clipboard.writeText(file.content);
        btn.classList.add('animate-pulse-once');
        btnText.textContent = '✓ Copié !';
        setTimeout(() => {
            btn.classList.remove('animate-pulse-once');
            btnText.textContent = 'Copier';
        }, 2000);
    } catch (err) {
        btnText.textContent = '✗ Erreur';
        setTimeout(() => btnText.textContent = 'Copier', 2000);
    }
}

function downloadFile(index) {
    const file = convertedFiles[index];
    const blob = new Blob([file.content], { type: 'text/markdown; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.outputName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
