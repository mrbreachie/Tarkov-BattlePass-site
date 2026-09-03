let battlePassIndex; // { name, totalPages, pageFiles }
let documents;

const pagesCache = {};    // pageNumber -> parsed page JSON, once fetched
const pagesLoading = {};  // pageNumber -> in-flight fetch promise (avoids duplicate fetches)
const selectedItemIndexByPage = {}; // pageNumber -> selected item index

const SESSION_STATE_KEY = "battlepass-session-state";

let currentPageIndex = 0; // 0-indexed
let observer;
let rangeCustomized = false; // becomes true once the user manually picks a "From"/"To" page

// ---------- Session state ----------

function loadSessionState() {
    try {
        const rawState = sessionStorage.getItem(SESSION_STATE_KEY);

        if (!rawState) {
            return { currentPageIndex: 0 };
        }

        const parsedState = JSON.parse(rawState);

        return {
            currentPageIndex: Number.isFinite(parsedState?.currentPageIndex)
                ? parsedState.currentPageIndex
                : 0,
        };
    } catch (error) {
        console.warn("Could not load saved session state.", error);
        return { currentPageIndex: 0 };
    }
}

function saveSessionState() {
    try {
        sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify({ currentPageIndex }));
    } catch (error) {
        console.warn("Could not save session state.", error);
    }
}

// ---------- Helpers ----------

function getTotalPages() {
    return battlePassIndex.pageFiles.length;
}

function getSafeItemIndex(page, index) {
    if (!page || !Array.isArray(page.items) || page.items.length === 0) {
        return 0;
    }
    return Math.min(Math.max(index, 0), page.items.length - 1);
}

function normalizeDocumentValue(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function getDocumentByName(documentValue) {
    const normalized = normalizeDocumentValue(documentValue);
    return documents.find(document =>
        normalizeDocumentValue(document.shortName) === normalized ||
        normalizeDocumentValue(document["Document name"]) === normalized
    );
}

// ---------- Data loading (lazy, per page) ----------

async function init() {
    try {
        const indexResponse = await fetch("./data/battlepass-index.json");
        if (!indexResponse.ok) {
            throw new Error("Could not load battlepass-index.json");
        }
        battlePassIndex = await indexResponse.json();

        const documentsResponse = await fetch("./data/documents.json");
        if (!documentsResponse.ok) {
            throw new Error("Could not load documents.json");
        }
        documents = await documentsResponse.json();

        buildSlides();
        buildProgressBar();

        const savedState = loadSessionState();
        const totalPages = getTotalPages();
        currentPageIndex = Math.min(Math.max(savedState.currentPageIndex, 0), totalPages - 1);

        populateRangeDropdowns();

        scrollToPage(currentPageIndex, false);
        setupIntersectionObserver();

        const startingPageNumber = currentPageIndex + 1;
        await ensurePageLoaded(startingPageNumber);
        await renderSlide(startingPageNumber);
        updateProgressUI();

        // Quietly prefetch neighbors so scrolling either direction feels instant
        if (currentPageIndex > 0) ensurePageLoaded(currentPageIndex);
        if (currentPageIndex < totalPages - 1) ensurePageLoaded(currentPageIndex + 2);
    } catch (error) {
        console.error(error);
        document.querySelector("#pages-scroll").innerHTML = `
      <p class="error-message">
        Could not load the BattlePass data.
      </p>
    `;
    }
}

function getPageFileForNumber(pageNumber) {
    return battlePassIndex.pageFiles[pageNumber - 1];
}

function ensurePageLoaded(pageNumber) {
    if (pagesCache[pageNumber]) return Promise.resolve(pagesCache[pageNumber]);
    if (pagesLoading[pageNumber]) return pagesLoading[pageNumber];

    const fileName = getPageFileForNumber(pageNumber);
    if (!fileName) return Promise.resolve(null);

    const promise = fetch(`./data/pages/${fileName}`)
        .then(response => {
            if (!response.ok) throw new Error(`Could not load ${fileName}`);
            return response.json();
        })
        .then(pageData => {
            pagesCache[pageNumber] = pageData;
            delete pagesLoading[pageNumber];
            return pageData;
        })
        .catch(error => {
            delete pagesLoading[pageNumber];
            console.error(error);
            renderSlideError(pageNumber);
            return null;
        });

    pagesLoading[pageNumber] = promise;
    return promise;
}

function renderSlideError(pageNumber) {
    const itemList = document.querySelector(`#item-list-${pageNumber}`);
    if (itemList) {
        itemList.innerHTML = `<p class="error-message">Could not load this page.</p>`;
    }
}

// ---------- Slide + progress bar construction (dynamic, based on pageFiles.length) ----------

function buildSlides() {
    const container = document.querySelector("#pages-scroll");
    const totalPages = getTotalPages();

    let html = "";
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        html += buildSlideTemplate(pageNumber);
    }

    container.innerHTML = html;
}

function buildSlideTemplate(pageNumber) {
    return `
    <div class="page-slide" data-page-number="${pageNumber}">
      <main class="battlepass-layout">

        <section class="item-list-panel">
          <h2>Rewards</h2>
          <div id="item-list-${pageNumber}">
            <p class="empty-message">Loading…</p>
          </div>
        </section>

        <section class="preview-panel">
          <div id="preview-${pageNumber}">
            <p class="empty-message">
              Select an item to view its details.
            </p>
          </div>
        </section>

        <aside class="requirements-panel">
          <h2>Page Requirements</h2>

          <div class="page-summary-box" id="page-summary-${pageNumber}"></div>
        </aside>

      </main>

      <section class="full-width-section">
        <details class="collapsible-section" open>
          <summary>
            <span>Documents Needed This Page</span>
            <span class="summary-meta" id="page-documents-meta-${pageNumber}"></span>
          </summary>
          <div class="disclosure-body">
            <div class="disclosure-inner" id="page-documents-${pageNumber}"></div>
          </div>
        </details>
      </section>
    </div>
  `;
}

function buildProgressBar() {
    const container = document.querySelector("#progress-segments");
    const totalPages = getTotalPages();

    let html = "";
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        html += `<button class="progress-segment" data-page-number="${pageNumber}" aria-label="Go to page ${pageNumber}">${pageNumber}</button>`;
    }
    container.innerHTML = html;

    container.querySelectorAll(".progress-segment").forEach(segment => {
        segment.addEventListener("click", () => {
            const pageNumber = Number(segment.dataset.pageNumber);
            scrollToPage(pageNumber - 1, true);
        });
    });
}

function updateProgressUI() {
    const totalPages = getTotalPages();
    const pageNumber = currentPageIndex + 1;

    document.querySelector("#progress-label").textContent = `Page ${pageNumber} of ${totalPages}`;

    document.querySelectorAll(".progress-segment").forEach(segment => {
        const segmentPage = Number(segment.dataset.pageNumber);
        segment.classList.toggle("active", segmentPage === pageNumber);
        segment.classList.toggle("completed", segmentPage < pageNumber);
    });

    updateNavigationButtons();
}

function updateNavigationButtons() {
    const totalPages = getTotalPages();
    const isFirstPage = currentPageIndex === 0;
    const isLastPage = currentPageIndex === totalPages - 1;

    document.querySelector("#previous-page").disabled = isFirstPage;
    document.querySelector("#next-page").disabled = isLastPage;
}

// ---------- Scrolling / navigation ----------

function scrollToPage(pageIndex, smooth) {
    const scrollContainer = document.querySelector("#pages-scroll");
    const slide = scrollContainer.children[pageIndex];
    if (!slide) return;

    scrollContainer.scrollTo({
        left: slide.offsetLeft,
        behavior: smooth ? "smooth" : "auto",
    });
}

function goToPreviousPage() {
    if (currentPageIndex > 0) {
        scrollToPage(currentPageIndex - 1, true);
    }
}

function goToNextPage() {
    if (currentPageIndex < getTotalPages() - 1) {
        scrollToPage(currentPageIndex + 1, true);
    }
}

function setupIntersectionObserver() {
    const scrollContainer = document.querySelector("#pages-scroll");

    observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const pageNumber = Number(entry.target.dataset.pageNumber);
                handleSlideVisible(pageNumber);
            }
        });
    }, {
        root: scrollContainer,
        threshold: 0.6,
    });

    document.querySelectorAll(".page-slide").forEach(slide => observer.observe(slide));
}

async function handleSlideVisible(pageNumber) {
    currentPageIndex = pageNumber - 1;
    updateProgressUI();
    saveSessionState();

    const totalPages = getTotalPages();

    await ensurePageLoaded(pageNumber);
    renderSlide(pageNumber);

    // Prefetch neighbors so continued scrolling stays smooth
    if (pageNumber > 1) ensurePageLoaded(pageNumber - 1);
    if (pageNumber < totalPages) ensurePageLoaded(pageNumber + 1);
}

// ---------- Rendering (per-slide, scoped by pageNumber) ----------

async function renderSlide(pageNumber) {
    const page = pagesCache[pageNumber];
    if (!page) return;

    const selectedIndex = getSafeItemIndex(page, selectedItemIndexByPage[pageNumber] ?? 0);
    selectedItemIndexByPage[pageNumber] = selectedIndex;

    renderItemList(pageNumber, page, selectedIndex);
    renderPageRequirements(pageNumber, page);

    if (page.items.length > 0) {
        renderSelectedItem(pageNumber, page.items[selectedIndex]);
    } else {
        document.querySelector(`#preview-${pageNumber}`).innerHTML = `
      <p class="empty-message">
        No items have been added to this page yet.
      </p>
    `;
    }

    if (!rangeCustomized) {
        const toSelect = document.querySelector("#range-to");
        if (toSelect) toSelect.value = String(pageNumber);
    }
    await updateRangePanel();
}

function renderItemList(pageNumber, page, selectedIndex) {
    const itemList = document.querySelector(`#item-list-${pageNumber}`);
    itemList.innerHTML = "";

    if (page.items.length === 0) {
        itemList.innerHTML = `
      <p class="empty-message">No items on this page.</p>
    `;
        return;
    }

    page.items.forEach((item, index) => {
        const button = document.createElement("button");
        button.className = "item-card";

        if (index === selectedIndex) {
            button.classList.add("selected");
        }

        const image = item.image || "./images/items/placeholder.png";
        const itemName = item.itemName || "Unnamed item";

        button.innerHTML = `
      <img src="${image}" alt="${itemName}">
      <span class="item-card-name">${itemName}</span>
    `;

        button.addEventListener("click", () => {
            selectedItemIndexByPage[pageNumber] = index;

            itemList
                .querySelectorAll(".item-card")
                .forEach(card => card.classList.remove("selected"));

            button.classList.add("selected");

            renderSelectedItem(pageNumber, item);
            saveSessionState();
        });

        itemList.appendChild(button);
    });
}

function renderSelectedItem(pageNumber, item) {
    const preview = document.querySelector(`#preview-${pageNumber}`);
    const image = item.image || "./images/items/placeholder-large.png";
    const itemName = item.itemName || "Unnamed item";

    preview.innerHTML = `
    <div class="large-preview">
      <img src="${image}" alt="${itemName}">
    </div>

    <h2>${itemName}</h2>

    <h3>Documents Required</h3>
    <div class="selected-item-requirements">
      ${renderRequirements(item.requirements)}
    </div>
  `;
}

function getDocumentIcon(documentName) {
    const document = getDocumentByName(documentName);
    return document && document.image ? document.image : "";
}

function buildDocumentLabel(documentName, labelText) {
    const icon = getDocumentIcon(documentName);
    const name = labelText || getDocumentShortName(documentName);

    if (!icon) {
        return `<span class="document-label"><span class="document-label-text">${name}</span></span>`;
    }

    return `
      <span class="document-label">
        <img class="document-icon" src="${icon}" alt="${name}">
        <span class="document-label-text">${name}</span>
      </span>
    `;
}

function renderRequirements(requirements) {
    if (!requirements || requirements.length === 0) {
        return `
      <p class="empty-message">
        No document amounts entered yet.
      </p>
    `;
    }

    return requirements.map(requirement => {
        const document = getDocumentByName(requirement.documentName);
        const name = document ? document["Document name"] : requirement.documentName;

        return `
      <div class="requirement-row">
        <span class="document-name-cell">${buildDocumentLabel(requirement.documentName, name)}</span>
        <strong>${requirement.amount}</strong>
      </div>
    `;
    }).join("");
}

function getCanonicalDocumentKey(documentName) {
    const document = getDocumentByName(documentName);
    return document ? document["Document name"] : documentName;
}

function getDocumentShortName(documentName) {
    const document = getDocumentByName(documentName);
    return document ? document.shortName : documentName;
}

function formatDocumentSummary(totals) {
    const entries = Object.entries(totals || {})
        .filter(([, amount]) => Number(amount) > 0)
        .map(([documentName, amount]) => `${getDocumentShortName(documentName)} ${amount}`)
        .join(", ");

    return entries || "None";
}

function buildDocumentRows(totals) {
    const entries = Object.entries(totals || {})
        .filter(([, amount]) => Number(amount) > 0)
        .sort(([a], [b]) => getDocumentShortName(a).localeCompare(getDocumentShortName(b)));

    if (entries.length === 0) {
        return `
      <p class="empty-message">No documents required.</p>
    `;
    }

    const rows = entries.map(([documentName, amount]) => `
      <div class="requirement-row">
        <span class="document-name-cell">${buildDocumentLabel(documentName, getDocumentShortName(documentName))}</span>
        <strong>${amount}</strong>
      </div>
    `).join("");

    return `<div class="document-rows-grid">${rows}</div>`;
}

function buildTotalRow(totals) {
    const total = Object.values(totals || {}).reduce((sum, value) => sum + Number(value || 0), 0);

    return `
      <div class="requirement-row requirement-row-total">
        <strong>Total:</strong>
        <strong>${total}</strong>
      </div>
    `;
}

function buildCollapsibleSection(title, summaryText, contentHtml, isOpen = false, extraClass = "") {
    const stateClass = isOpen ? "" : " is-collapsed";
    const className = `collapsible-section${extraClass ? " " + extraClass : ""}${stateClass}`;
    const openAttr = isOpen ? " open" : "";

    return `
      <details class="${className}"${openAttr}>
        <summary>
          <span>${title}</span>
          <span class="summary-meta">${summaryText}</span>
        </summary>
        <div class="disclosure-body">
          <div class="disclosure-inner">${contentHtml}</div>
        </div>
      </details>
    `;
}

function calculatePageTotals(page) {
    const totals = {};

    page.items.forEach(item => {
        if (!item.requirements) return;

        item.requirements.forEach(requirement => {
            const key = getCanonicalDocumentKey(requirement.documentName);

            if (!totals[key]) {
                totals[key] = 0;
            }
            totals[key] += Number(requirement.amount) || 0;
        });
    });

    return totals;
}

function calculateMinimumItemsForPrerequisites(page) {
    if (!page.prerequisites || !page.prerequisites.itemsRequired) {
        return [];
    }

    const itemsNeeded = page.prerequisites.itemsRequired;

    const itemsWithCosts = page.items.map(item => {
        const itemCost = {};
        if (item.requirements) {
            item.requirements.forEach(req => {
                const key = getCanonicalDocumentKey(req.documentName);
                itemCost[key] = (itemCost[key] || 0) + Number(req.amount);
            });
        }

        const totalCost = Object.values(itemCost).reduce((sum, value) => sum + Number(value || 0), 0);

        return {
            itemName: item.itemName || "Unnamed item",
            itemCost,
            totalCost,
        };
    });

    itemsWithCosts.sort((a, b) => a.totalCost - b.totalCost);

    return itemsWithCosts.slice(0, Math.min(itemsNeeded, itemsWithCosts.length));
}

function calculateMinimumForPrerequisites(page) {
    const minimumItems = calculateMinimumItemsForPrerequisites(page);
    const minimumTotals = {};

    minimumItems.forEach(({ itemCost }) => {
        Object.entries(itemCost).forEach(([docName, amount]) => {
            minimumTotals[docName] = (minimumTotals[docName] || 0) + Number(amount || 0);
        });
    });

    return minimumTotals;
}

function populateRangeDropdowns() {
    const fromSelect = document.querySelector("#range-from");
    const toSelect = document.querySelector("#range-to");
    if (!fromSelect || !toSelect) return;

    const totalPages = getTotalPages();
    let options = "";
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        options += `<option value="${pageNumber}">Page ${pageNumber}</option>`;
    }

    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;

    fromSelect.value = "1";
    toSelect.value = String(currentPageIndex + 1);

    fromSelect.addEventListener("change", () => {
        rangeCustomized = true;
        updateRangePanel();
    });

    toSelect.addEventListener("change", () => {
        rangeCustomized = true;
        updateRangePanel();
    });
}

async function updateRangePanel() {
    const fromSelect = document.querySelector("#range-from");
    const toSelect = document.querySelector("#range-to");
    if (!fromSelect || !toSelect || !fromSelect.value || !toSelect.value) return;

    let fromPage = Number(fromSelect.value);
    let toPage = Number(toSelect.value);

    if (fromPage > toPage) {
        [fromPage, toPage] = [toPage, fromPage];
    }

    const pageNumbers = [];
    for (let pageNumber = fromPage; pageNumber <= toPage; pageNumber++) {
        pageNumbers.push(pageNumber);
    }
    await Promise.all(pageNumbers.map(ensurePageLoaded));

    const totals = calculateRangeTotals(fromPage, toPage);
    renderRangePanel(fromPage, toPage, totals);
}

function calculateRangeTotals(fromPage, toPage) {
    const totals = {};

    for (let pageNumber = fromPage; pageNumber <= toPage; pageNumber++) {
        const page = pagesCache[pageNumber];
        if (!page) continue;

        const threshold = page.prerequisites?.itemsRequired || 0;
        const pageCost = threshold > 0
            ? calculateMinimumForPrerequisites(page)
            : calculatePageTotals(page);

        Object.entries(pageCost).forEach(([documentName, amount]) => {
            totals[documentName] = (totals[documentName] || 0) + amount;
        });
    }

    return totals;
}

function renderRangePanel(fromPage, toPage, totals) {
    const summaryMeta = document.querySelector("#range-summary-meta");
    const content = document.querySelector("#range-content");
    if (!summaryMeta || !content) return;

    summaryMeta.textContent = `Page ${fromPage} → Page ${toPage} · ${formatDocumentSummary(totals)}`;

    content.innerHTML = `
      ${buildDocumentRows(totals)}
      ${buildTotalRow(totals)}
      ${buildRangeRouteSummary(fromPage, toPage)}
    `;
}

function buildRangeRouteSummary(fromPage, toPage) {
    const steps = [];

    for (let pageNumber = fromPage; pageNumber <= toPage; pageNumber++) {
        const page = pagesCache[pageNumber];
        if (!page) continue;

        const minimumItems = calculateMinimumItemsForPrerequisites(page);
        const itemsHtml = minimumItems.length
            ? `<ul class="route-step-items">${minimumItems.map(item => `<li>${item.itemName}</li>`).join("")}</ul>`
            : `<span class="route-step-empty">No item unlock required</span>`;

        steps.push(`
          <div class="route-step">
            <div class="route-step-header">Page ${pageNumber}</div>
            ${itemsHtml}
          </div>
        `);
    }

    return `
      <details class="route-summary" open>
        <summary>
          <span>Route for this range</span>
        </summary>
        <div class="disclosure-body">
          <div class="disclosure-inner">
            <div class="route-steps">
              ${steps.length ? steps.join("") : '<p class="empty-message">No route data yet.</p>'}
            </div>
          </div>
        </div>
      </details>
    `;
}

function buildMinimumPathDetailHtml(minimumItems, minimumTotals) {
    const itemsHtml = minimumItems.length
        ? `<div class="minimum-items-grid">${minimumItems.map(({ itemName, itemCost }) => {
            const itemTotal = Object.values(itemCost).reduce((sum, value) => sum + Number(value || 0), 0);
            const itemCostHtml = Object.entries(itemCost).map(([docName, amount]) => {
                const shortName = getDocumentShortName(docName);
                return `<li>${buildDocumentLabel(docName, shortName)} ${amount}</li>`;
            }).join("");

            return `
              <div class="minimum-item">
                <div class="minimum-item-header">
                  <strong>${itemName}</strong>
                  <span>${itemTotal}</span>
                </div>
                <ul class="minimum-item-costs">${itemCostHtml}</ul>
              </div>
            `;
        }).join("")}</div>`
        : `<p class="empty-message">No minimum path required.</p>`;

    return `
      ${itemsHtml}
      <h4>Document Totals</h4>
      ${buildDocumentRows(minimumTotals)}
      ${buildTotalRow(minimumTotals)}
    `;
}

function renderPageRequirements(pageNumber, page, cumulativeTotals = {}) {
    const summaryEl = document.querySelector(`#page-summary-${pageNumber}`);
    const pageDocumentsEl = document.querySelector(`#page-documents-${pageNumber}`);
    const pageDocumentsMetaEl = document.querySelector(`#page-documents-meta-${pageNumber}`);

    const totals = calculatePageTotals(page);
    const minimumTotals = calculateMinimumForPrerequisites(page);
    const prerequisiteItems = page.prerequisites?.itemsRequired || 0;
    const minimumItems = calculateMinimumItemsForPrerequisites(page);

    let summaryHtml = `
      <p>
        Items on this page:
        <strong>${page.items.length}</strong>
      </p>
    `;

    if (prerequisiteItems > 0) {
        summaryHtml += `
      <p>
        Items needed to unlock next page:
        <strong>${prerequisiteItems}</strong>
      </p>
    `;
    }

    summaryEl.innerHTML = summaryHtml;

    if (pageDocumentsMetaEl) {
        pageDocumentsMetaEl.textContent = formatDocumentSummary(totals);
    }

    const columns = [];

    if (prerequisiteItems > 0) {
        columns.push(buildCollapsibleSection(
            "Minimum Path",
            formatDocumentSummary(minimumTotals),
            buildMinimumPathDetailHtml(minimumItems, minimumTotals),
            false
        ));
    }

    columns.push(buildCollapsibleSection(
        "Page Total",
        formatDocumentSummary(totals),
        `${buildDocumentRows(totals)}${buildTotalRow(totals)}`,
        false
    ));

    pageDocumentsEl.innerHTML = `<div class="documents-columns">${columns.join("")}</div>`;
}

// ---------- Wiring ----------

document.addEventListener("click", (event) => {
    const summary = event.target.closest(".collapsible-section > summary, .route-summary > summary");
    if (!summary) return;

    event.preventDefault();

    const details = summary.parentElement;
    if (!details || !(details instanceof HTMLElement)) return;

    const nextOpenState = !details.hasAttribute("open");
    details.toggleAttribute("open", nextOpenState);
    details.classList.toggle("is-collapsed", !nextOpenState);
});

document.querySelector("#previous-page").addEventListener("click", goToPreviousPage);
document.querySelector("#next-page").addEventListener("click", goToNextPage);

document.querySelector("#jump-to-range").addEventListener("click", () => {
    const panel = document.querySelector("#range-panel");
    if (!panel) return;

    panel.open = true;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
});

init();