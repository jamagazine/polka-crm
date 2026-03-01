const fs = require('fs');
const path = require('path');

const targetPath = 'c:/Users/user/Desktop/ПОЛКА/ПОЛКА ПАРСЕР/Polka_0.4.1.8.5/src/modules/masters/MastersPage.tsx';
let content = fs.readFileSync(targetPath, 'utf8');

const regex = /<div className=\"-mx-6 -my-6 w-\[calc\(100%\+3rem\)\] h-\[calc\(100%\+3rem\)\] flex flex-col overflow-hidden\">[\s\S]*?(?=\n\s*\);\n\s*\}\n?$)/;

const replacement = `<div className="-mx-6 -my-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] flex flex-col overflow-hidden">
            <VirtualSmartTable
                data={paginatedMasters}
                activeColumns={activeColumns}
                sort={sort}
                toggleSort={toggleSort}
                activeSearchCol={activeSearchCol}
                searchTerm={searchTerm}
                setSearchCol={setSearchCol}
                setSearchTerm={setSearchTerm}
                selectedIds={selectedIds}
                toggleSelection={toggleSelection}
                isAllVisibleSelected={isAllVisibleSelected}
                isAllFilteredSelected={isAllFilteredSelected}
                handleHeaderCheckClick={handleHeaderCheckClick}
                highlightedIds={highlightedIds}
                clearHighlightedIds={clearHighlightedIds}
                wordWrap={wordWrap}
                showWarehouseRawNames={showRawNames}
                showShortNames={showShortNames}
                isProductView={false}
                draggedColId={draggedColId}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleDragEnd={handleDragEnd}
                dragOverColId={dragOverColId}
                dropPosition={dropPosition}
                onRowClick={() => {}}
                getDisplayName={(item) => (showRawNames ? item.name : (item.cleanName || item.name)) || "—"}
                formatShortName={formatShortName}
            />
        </div>`;

content = content.replace(regex, replacement);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Success');
