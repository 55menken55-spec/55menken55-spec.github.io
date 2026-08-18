        
        // ========== SUPABASE INTEGRATION FOR ТУЧЕНЦИЯ ==========
        const SUPABASE_URL = "https://lwzvgeeigqfvmatlihms.supabase.co";
        const SUPABASE_ANON_KEY = "sb_publishable_E7IyfHDCfN_ozCsrLZVcYQ_eZSXSeOe";
        const BUCKET = "artworks";
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // fallback local data (если Supabase пустой – покажем демо)
        const defaultPortfolioItems = [
            { category: 'Иллюстрация', img: 'https://i.ibb.co/TM9WvrFw/photo-2023-09-14-05-47-33.jpg' },
            { category: 'Иллюстрация', img: 'https://i.ibb.co/dJDjxcmK/photo-2023-09-14-05-49-17.jpg' },
            { category: 'Иллюстрация', img: 'https://i.ibb.co/TqqjgBmX/photo-2024-02-14-00-31-25.jpg' },
            { category: 'Иллюстрация', img: 'https://i.ibb.co/Q7fSFSTC/image.jpg' },
            { category: 'Живопись', img: 'https://i.ibb.co/Z6QLH265/photo-4-2025-12-14-22-00-00.png' },
            { category: 'Живопись', img: 'https://i.ibb.co/mCcyNf8N/photo-2025-12-14-15-07-47.png' },
            { category: 'Дизайн', img: 'https://i.ibb.co/jv8MWDmV/image.png' },
            { category: 'Роспись одежды', img: 'https://i.ibb.co/rRs6Vbs4/IMG-9533.jpg' },
            { category: 'Аквагрим', img: 'https://i.ibb.co/8gzSkKZc/photo-2026-05-24-09-38-59.jpg' },
            { category: 'Фотография', img: 'https://i.ibb.co/yFczP9fG/photo-2026-04-25-21-31-28.jpg' }
        ];

        const defaultShopItems = [
            { name: 'Оригинал картины',    img: 'https://i.ibb.co/Z6QLH265/photo-4-2025-12-14-22-00-00.png', price: '10 000 ₽' },
            { name: 'Цифровая лицензия',   img: 'https://i.ibb.co/Q7fSFSTC/image.jpg', price: '500 ₽' },
            { name: 'Авторский принт',     img: 'https://i.ibb.co/3YLQLg6j/photo-1-2026-03-20-09-18-30.jpg', price: '1 500 ₽' },
            { name: 'Набор стикеров',      img: 'https://i.ibb.co/dw1r3q0X/photo-2023-08-08-17-25-30.png', price: '300 ₽' },
        ];

        let portfolioItems = [];
        let shopItems = [];

        let isAdmin = localStorage.getItem('t_isAdmin') === 'true';

        // --- REORDER STATE ---
        let reorderMode = null; // null | 'drag' | 'swap'
        let swapSelectedIndex = null; // index of first selected card in swap mode
        let orderDirty = false; // whether the order has been changed and needs saving

        const services = [
            { title: 'Иллюстрация', desc: 'Персонажи, сюжеты и концепты в авторском стиле.', price: 'от 1 500 ₽' },
            { title: 'Живопись', desc: 'Картины и панно в авторском стиле.', price: 'от 5 000 ₽' },
            { title: 'Роспись одежды', desc: 'Уникальные принты и роспись на текстиле.', price: 'от 3 000 ₽' },
            { title: 'Дизайн: графический и полиграфический', desc: 'Логотипы, фирменный стиль, печатная продукция.', price: 'от 2 500 ₽' },
            { title: 'Фотосъёмка', desc: 'Творческие и предметные фотосессии.', price: 'от 4 000 ₽' },
            { title: 'Аквагрим', desc: 'Креативный грим для мероприятий, фестивалей и фотосессий. Открыта к сотрудничеству с ивент-агентствами, фотографами и студиями.', price: 'от 2 000 ₽' },
        ];

        const tgUsername = 'tychenciya';

        function makeTgLink(text) {
            return `https://t.me/${tgUsername}?text=${encodeURIComponent(text)}`;
        }

        function groupPortfolio(items) {
            const groups = {};
            items.forEach(item => {
                if (!groups[item.category]) groups[item.category] = [];
                groups[item.category].push(item);
            });
            return groups;
        }

        let currentFilter = 'all';
        let shownCount = 6;

        // ---------- SUPABASE DATA LAYER ----------
        async function loadPortfolioFromSupabase(){
            try{
                // Пытаемся загрузить с sort_order; если колонки нет — грузим без неё
                let data, error;
                const res = await sb.from('portfolio')
                  .select('id, category, image_url, title, created_at, sort_order')
                  .order('sort_order', { ascending: true, nullsFirst: false })
                  .order('created_at', { ascending: false });
                data = res.data;
                error = res.error;
                if(error){
                    // Если ошибка из-за отсутствия sort_order — пробуем без неё
                    console.warn('sort_order query failed, retrying without it:', error.message);
                    hasSortOrder = false;
                    const fallback = await sb.from('portfolio')
                      .select('id, category, image_url, title, created_at')
                      .order('created_at', { ascending: false });
                    data = fallback.data;
                    error = fallback.error;
                    if(error) throw error;
                } else {
                    hasSortOrder = true;
                }
                if(data && data.length){
                    portfolioItems = data.map((r, i) => ({
                        id: r.id,
                        category: r.category || 'Иллюстрация',
                        img: r.image_url,
                        title: r.title || '',
                        sort_order: r.sort_order != null ? r.sort_order : i
                    }));
                    return true;
                } else {
                    return false;
                }
            }catch(e){
                console.error('Supabase portfolio load error', e);
                showToast('Supabase: '+e.message, true);
                return false;
            }
        }
        async function loadShopFromSupabase(){
            try{
                const { data, error } = await sb.from('shop')
                  .select('id, name, title, price, image_url, available, created_at')
                  .order('created_at', { ascending: false });
                if(error) throw error;
                if(data && data.length){
                    shopItems = data.map(r => ({
                        id: r.id,
                        name: r.name || r.title || 'Товар',
                        price: r.price ? (typeof r.price === 'number' ? new Intl.NumberFormat('ru-RU').format(r.price)+' ₽' : r.price) : 'Цена по запросу',
                        price_raw: r.price,
                        img: r.image_url,
                        available: r.available !== false
                    }));
                    return true;
                } else {
                    return false;
                }
            }catch(e){
                console.error('Supabase shop load error', e);
                showToast('Supabase shop: '+e.message, true);
                return false;
            }
        }

        async function uploadFileToSupabase(file, folder='portfolio'){
            if(!file) return null;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
            const safe = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
            const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safe}`;
            const loader = document.getElementById('upload-loader-container');
            if(loader){ loader.classList.remove('hidden'); loader.classList.add('flex'); }
            try{
                const { error: upErr } = await sb.storage.from(BUCKET).upload(path, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: file.type
                });
                if(upErr) throw upErr;
                const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
                return data.publicUrl;
            } finally {
                if(loader){ loader.classList.add('hidden'); loader.classList.remove('flex'); }
            }
        }

        function showToast(msg, isErr){
            let t = document.getElementById('sb-toast');
            if(!t){
                t = document.createElement('div');
                t.id='sb-toast';
                t.style.cssText='position:fixed;bottom:22px;right:22px;z-index:9999;background:#1e1e28;color:#fff;padding:12px 16px;border-radius:12px;font-size:14px;max-width:360px;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:.25s;opacity:0;transform:translateY(8px);border:1px solid #CBE85766';
                document.body.appendChild(t);
            }
            t.textContent = msg;
            t.style.borderColor = isErr ? '#ff6b6b' : '#CBE85766';
            t.style.opacity='1'; t.style.transform='translateY(0)';
            clearTimeout(t._tid);
            t._tid = setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateY(8px)'; }, 3000);
        }

        async function initSite() {
            // about avatar
            try{
                const { data:avData } = await sb.from('site_settings').select('value').eq('key','about_avatar_url').maybeSingle();
                const supaAvatar = avData?.value;
                const savedAboutImg = supaAvatar || localStorage.getItem('t_about_img');
                if (savedAboutImg) {
                    const aImg = document.getElementById('about-img');
                    if(aImg) aImg.src = savedAboutImg;
                }
            }catch(e){ 
                const savedAboutImg = localStorage.getItem('t_about_img');
                if (savedAboutImg) { const aImg=document.getElementById('about-img'); if(aImg) aImg.src=savedAboutImg; }
            }

            await loadSavedTexts();
            updateAdminUI();

            // Грузим из Supabase
            const okP = await loadPortfolioFromSupabase();
            if(!okP){
                const local = JSON.parse(localStorage.getItem('t_portfolio')||'null');
                portfolioItems = local && local.length ? local : defaultPortfolioItems.map((x,i)=>({...x, id:'local-'+i}));
                showToast('Портфолио: локальный fallback', true);
            } else {
                showToast('Портфолио загружено из Supabase: '+portfolioItems.length);
            }
            const okS = await loadShopFromSupabase();
            if(!okS){
                const localShop = JSON.parse(localStorage.getItem('t_shop')||'null');
                shopItems = localShop && localShop.length ? localShop : defaultShopItems.map((x,i)=>({...x, id:'local-'+i}));
            } else {
                showToast('Магазин из Supabase: '+shopItems.length);
            }

            // фильтры
            const filterContainer = document.getElementById('port-filters');
            if(filterContainer){
                filterContainer.innerHTML = '';
                const categories = ['Все', 'Иллюстрация', 'Живопись', 'Дизайн', 'Роспись одежды', 'Аквагрим', 'Фотография'];
                categories.forEach(f => {
                    const btn = document.createElement('button');
                    btn.className = `btn-tuch px-4 py-1 text-sm uppercase tracking-widest ${f === 'Все' && currentFilter === 'all' ? 'filter-active' : (f === currentFilter ? 'filter-active' : '')}`;
                    btn.innerText = f;
                    btn.dataset.filter = f === 'Все' ? 'all' : f;
                    btn.onclick = () => filterPortfolio(btn.dataset.filter);
                    filterContainer.appendChild(btn);
                });
            }

            renderPortfolioGrid();

            const servGrid = document.getElementById('serv-grid');
            if(servGrid){
                servGrid.innerHTML = '';
                services.forEach(s => {
                    const div = document.createElement('div');
                    div.className = `card-tuch p-6 flex flex-col justify-between`;
                    const tgText = `Здравствуйте! Интересует услуга «${s.title}». Расскажите, пожалуйста, подробнее о сроках и стоимости.`;
                    div.innerHTML = `
                        <div>
                            <h3 class="text-xl font-bold mb-2">${s.title}</h3>
                            <p class="opacity-80 mb-4">${s.desc}</p>
                        </div>
                        <div class="flex items-center justify-between mt-4">
                            <div class="font-bold">${s.price}</div>
                            <a href="${makeTgLink(tgText)}" target="_blank" class="btn-tuch px-4 py-2 text-sm uppercase tracking-wide">Заказать</a>
                        </div>
                    `;
                    servGrid.appendChild(div);
                });
            }

            renderShopGrid();

            const statusEl = document.getElementById('supabase-status');
            if(statusEl){
                statusEl.textContent = okP ? `Supabase ✓ ${portfolioItems.length} работ` : 'Supabase offline – local fallback';
                statusEl.style.color = okP ? '#CBE857' : '#E8A0BF';
            }
        }

        async function loadSavedTexts() {
            try{
                const { data, error } = await sb.from('site_texts').select('id, value');
                if(!error && data && data.length){
                    data.forEach(row=>{
                        const el = document.querySelector(`[data-edit-id="${row.id}"]`);
                        if(el) el.innerText = row.value;
                    });
                    const cache={}; data.forEach(r=>cache[r.id]=r.value);
                    localStorage.setItem('t_texts', JSON.stringify(cache));
                    return;
                }
            }catch(e){ console.warn('site_texts supabase fail', e); }
            const savedTexts = JSON.parse(localStorage.getItem('t_texts')) || {};
            Object.keys(savedTexts).forEach(id => {
                const el = document.querySelector(`[data-edit-id="${id}"]`);
                if (el) {
                    el.innerText = savedTexts[id];
                }
            });
        }

        function renderPortfolioGrid() {
            const grid = document.getElementById('port-grid');
            if(!grid) return;
            grid.innerHTML = '';

            const portfolioGroups = groupPortfolio(portfolioItems);
            const categoryNames = Object.keys(portfolioGroups);

            if (currentFilter === 'all') {
                let previewItems = [];
                categoryNames.forEach(cat => {
                    const items = portfolioGroups[cat];
                    if (items && items.length > 0) {
                        previewItems.push({ item: items[0], index: portfolioItems.indexOf(items[0]) });
                    }
                });

                previewItems.forEach(p => {
                    grid.appendChild(createCardElement(p.item, p.index, true, false, true, true));
                });

                let extraItems = [];
                portfolioItems.forEach((item, idx) => {
                    const isPreview = previewItems.some(p => p.index === idx);
                    if (!isPreview) {
                        extraItems.push({ item, idx });
                    }
                });

                extraItems.forEach((ex, index) => {
                    const isVisible = index < shownCount;
                    grid.appendChild(createCardElement(ex.item, ex.idx, false, true, isVisible, false));
                });

                const remaining = extraItems.length - shownCount;
                renderShowMoreButton(remaining > 0);

            } else {
                portfolioItems.forEach((item, idx) => {
                    if (item.category === currentFilter) {
                        grid.appendChild(createCardElement(item, idx, false, false, true, false));
                    }
                });
                renderShowMoreButton(false);
            }

            // Re-attach drag/swap listeners after render
            if(reorderMode === 'drag') attachDragListeners();
            if(reorderMode === 'swap') attachSwapListeners();
        }

        function createCardElement(item, globalIndex, isPreview, isExtra, isVisible = true, isFirstScreen = false) {
            const div = document.createElement('div');
            div.className = `card-tuch overflow-hidden aspect-square ${(!isVisible) ? 'hidden-item' : ''}`;
            div.dataset.category = item.category;
            div.dataset.index = globalIndex;
            if (isPreview) div.dataset.preview = 'true';
            if (isExtra) div.dataset.extra = 'true';

            const loadingStrategy = isFirstScreen ? 'eager' : 'lazy';
            const imgSrc = item.img || item.image_url || '';
            let html = `<img src="${imgSrc}" class="w-full h-full object-cover" loading="${loadingStrategy}" width="280" height="280" alt="${item.category} - Работа Розалии" draggable="false">`;

            // Admin overlay (Заменить / Удалить)
            if (isAdmin) {
                html += `
                    <div class="card-admin-overlay absolute inset-0 bg-black/75 flex flex-col justify-between p-3 opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <span class="text-xs bg-[#CBE857] text-[#323843] font-bold px-2 py-1 rounded self-start">${item.category}</span>
                        <div class="flex flex-col gap-2">
                            <button onclick="event.stopPropagation(); triggerReplaceImage(${globalIndex})" class="w-full bg-[#C68DFF] text-white hover:bg-white hover:text-[#323843] transition py-1.5 rounded-lg text-xs font-bold uppercase">Заменить</button>
                            <button onclick="event.stopPropagation(); deletePortfolioItem(${globalIndex})" class="w-full bg-red-500 hover:bg-red-600 transition text-white py-1.5 rounded-lg text-xs font-bold uppercase">Удалить</button>
                        </div>
                    </div>
                `;
            }

            div.innerHTML = html;
            return div;
        }

        function renderShopGrid() {
            const shopGrid = document.getElementById('shop-grid');
            if(!shopGrid) return;
            shopGrid.innerHTML = '';

            shopItems.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = `card-tuch p-4 text-center flex flex-col justify-between relative overflow-hidden`;
                const tgText = `Здравствуйте! Хочу приобрести «${item.name}». Подскажите, пожалуйста, как оформить заказ?`;
                
                let html = `
                    <div class="relative group aspect-square overflow-hidden rounded-lg mb-4">
                        <img src="${item.img}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" width="300" height="300">
                `;

                if (isAdmin) {
                    html += `
                        <div class="absolute inset-0 bg-black/85 flex flex-col justify-center items-center p-3 opacity-0 hover:opacity-100 transition-opacity duration-150">
                            <button onclick="triggerReplaceShopImage(${index})" class="bg-[#CBE857] text-[#323843] hover:scale-105 transition font-bold px-4 py-2 rounded-full text-xs uppercase mb-2">Заменить фото</button>
                            <button onclick="deleteShopItem(${index})" class="bg-red-500 text-white hover:scale-105 transition font-bold px-4 py-2 rounded-full text-xs uppercase">Удалить товар</button>
                        </div>
                    `;
                }

                html += `
                    </div>
                    <div>
                        <h3 data-shop-id="shop-name-${index}" class="font-bold mb-2 ${isAdmin ? 'editable-active' : ''}" ${isAdmin ? 'contenteditable="true" onblur="saveEditedShopText(event, ' + index + ', \'name\')"' : ''}>${item.name}</h3>
                        <p data-shop-id="shop-price-${index}" class="mb-4 font-mono text-[#CBE857] ${isAdmin ? 'editable-active' : ''}" ${isAdmin ? 'contenteditable="true" onblur="saveEditedShopText(event, ' + index + ', \'price\')"' : ''}>${item.price}</p>
                    </div>
                    <a href="${makeTgLink(tgText)}" target="_blank" class="btn-tuch w-full py-2 text-xs uppercase inline-block">Купить</a>
                `;

                div.innerHTML = html;
                shopGrid.appendChild(div);
            });
        }

        function renderShowMoreButton(visible) {
            const wrapper = document.getElementById('show-all-wrapper');
            if(!wrapper) return;
            wrapper.innerHTML = '';
            if (visible) {
                const showMoreBtn = document.createElement('button');
                showMoreBtn.id = 'show-more-btn';
                showMoreBtn.className = 'btn-tuch px-8 py-3 font-bold uppercase tracking-wide';
                showMoreBtn.innerText = 'Показать ещё ↓';
                showMoreBtn.onclick = () => {
                    shownCount += 6;
                    renderPortfolioGrid();
                };
                wrapper.appendChild(showMoreBtn);
            }
        }

        function filterPortfolio(category) {
            currentFilter = category;

            const buttons = document.querySelectorAll('#port-filters button');
            buttons.forEach(b => b.classList.remove('filter-active'));
            const activeBtn = Array.from(buttons).find(b => b.dataset.filter === category);
            if (activeBtn) activeBtn.classList.add('filter-active');

            renderPortfolioGrid();
        }

        /* ===== ADMIN ===== */
        
        const correctPasswordString = "tuch_studio_roza";

        function toggleAdminMode() {
            if (!isAdmin) {
                const enteredPass = prompt('Введите секретный ключ администратора:');
                if (enteredPass === null) return;

                if (enteredPass.trim() === correctPasswordString) {
                    isAdmin = true;
                    localStorage.setItem('t_isAdmin', 'true');
                    showToast('Админ-режим включён ✓');
                } else {
                    showToast('Неверный пароль', true);
                }
            } else {
                if (confirm('Выйти из режима администратора?')) {
                    isAdmin = false;
                    localStorage.removeItem('t_isAdmin');
                    // Reset reorder mode when leaving admin
                    reorderMode = null;
                    swapSelectedIndex = null;
                    orderDirty = false;
                }
            }
            updateAdminUI();
            initSite();
        }
        window.toggleAdminMode = toggleAdminMode;
        window.adminLogin = toggleAdminMode;

        function updateAdminUI() {
            const uploadPanel = document.getElementById('admin-upload-panel');
            const shopPanel = document.getElementById('admin-shop-panel');
            const indicator = document.getElementById('admin-indicator');
            const secretStar = document.getElementById('admin-secret-star');
            const aboutOverlay = document.getElementById('about-admin-overlay');
            const reorderBar = document.getElementById('reorder-bar');

            if (isAdmin) {
                if(uploadPanel) uploadPanel.classList.remove('hidden');
                if(shopPanel) shopPanel.classList.remove('hidden');
                if(indicator) indicator.classList.remove('hidden');
                if(secretStar) secretStar.setAttribute('fill', '#CBE857');
                if(reorderBar) reorderBar.style.display = 'block';
                enableTextEditing(true);
                
                if (aboutOverlay) {
                    aboutOverlay.style.display = 'flex';
                }
            } else {
                if(uploadPanel) uploadPanel.classList.add('hidden');
                if(shopPanel) shopPanel.classList.add('hidden');
                if(indicator) indicator.classList.add('hidden');
                if(secretStar) secretStar.setAttribute('fill', '#C68DFF');
                if(reorderBar) reorderBar.style.display = 'none';
                enableTextEditing(false);

                if (aboutOverlay) {
                    aboutOverlay.style.display = 'none';
                }
            }
        }

        function enableTextEditing(enable) {
            const elements = document.querySelectorAll('[data-edit-id]');
            elements.forEach(el => {
                if (enable) {
                    el.classList.add('editable-active');
                    el.setAttribute('contenteditable', 'true');
                    el.addEventListener('blur', saveEditedText);
                } else {
                    el.classList.remove('editable-active');
                    el.removeAttribute('contenteditable');
                    el.removeEventListener('blur', saveEditedText);
                }
            });
        }

        async function saveEditedText(event) {
            const el = event.target;
            const id = el.dataset.editId;
            const newText = el.innerText.trim();

            const savedTexts = JSON.parse(localStorage.getItem('t_texts')) || {};
            savedTexts[id] = newText;
            localStorage.setItem('t_texts', JSON.stringify(savedTexts));

            try{
                const { error } = await sb.from('site_texts')
                  .upsert({ id, value: newText }, { onConflict: 'id' });
                if(error) throw error;
                showToast('Текст сохранён в Supabase ✓');
            }catch(e){
                console.error(e);
                showToast('Текст сохранён локально, Supabase ошибка: '+e.message, true);
            }
        }

        window.saveEditedShopText = async function(event, index, field) {
            const el = event.target;
            const newText = el.innerText.trim();
            const item = shopItems[index];
            if(!item) return;
            shopItems[index][field] = newText;
            if(item.id && !String(item.id).startsWith('local-')){
                try{
                    const update = {};
                    if(field==='name') update.name = newText;
                    if(field==='price'){
                        update.price = newText;
                        const num = parseFloat(newText.replace(/[^\d.]/g,''));
                        if(!isNaN(num)) update.price_numeric = num;
                    }
                    await sb.from('shop').update(update).eq('id', item.id);
                    showToast('Сохранено в Supabase');
                }catch(e){ console.error(e); showToast(e.message,true); }
            }
            localStorage.setItem('t_shop', JSON.stringify(shopItems));
        };

        function toggleUploadMethod() {
            const methodEl = document.getElementById('upload-method');
            if(!methodEl) return;
            const method = methodEl.value;
            const containerUrl = document.getElementById('method-url-container');
            const containerFile = document.getElementById('method-file-container');

            if (method === 'url') {
                if(containerUrl) containerUrl.classList.remove('hidden');
                if(containerFile) containerFile.classList.add('hidden');
            } else {
                if(containerUrl) containerUrl.classList.add('hidden');
                if(containerFile) containerFile.classList.remove('hidden');
            }
        }
        window.toggleUploadMethod = toggleUploadMethod;

        async function addNewPortfolioItem() {
            const catEl = document.getElementById('admin-new-cat');
            const category = catEl ? catEl.value : 'Иллюстрация';
            const methodEl = document.getElementById('upload-method');
            const method = methodEl ? methodEl.value : 'file';

            try{
                let imageUrl = null;
                if (method === 'url') {
                    const urlEl = document.getElementById('admin-new-url');
                    const url = urlEl ? urlEl.value.trim() : '';
                    if (!url) { alert('Пожалуйста, введите URL изображения!'); return; }
                    imageUrl = url;
                } else {
                    const fileInput = document.getElementById('admin-new-file');
                    if (!fileInput || fileInput.files.length === 0) {
                        alert('Пожалуйста, выберите файл!');
                        return;
                    }
                    const file = fileInput.files[0];
                    imageUrl = await uploadFileToSupabase(file, 'portfolio');
                    if(fileInput) fileInput.value='';
                }
                if(!imageUrl) throw new Error('Нет URL изображения');

                // Assign sort_order = max + 1
                const maxOrder = portfolioItems.reduce((max, it) => Math.max(max, it.sort_order || 0), 0);

                // Try insert with sort_order; if column doesn't exist, retry without it
                let data, error;
                const insertPayload = {
                    category,
                    image_url: imageUrl,
                    title: category,
                    sort_order: maxOrder + 1
                };
                const res = await sb.from('portfolio').insert(insertPayload).select().single();
                data = res.data; error = res.error;
                if(error && error.message && error.message.includes('sort_order')){
                    // sort_order column doesn't exist — retry without it
                    console.warn('Insert without sort_order');
                    const retry = await sb.from('portfolio').insert({
                        category, image_url: imageUrl, title: category
                    }).select().single();
                    data = retry.data; error = retry.error;
                }
                if(error) throw error;
                showToast('Добавлено в Supabase ✓');
                const urlInput = document.getElementById('admin-new-url');
                if(urlInput) urlInput.value='';
                await initSite();
            }catch(e){
                console.error(e);
                alert('Ошибка Supabase: '+e.message);
                showToast(e.message, true);
            }
        }
        window.addNewPortfolioItem = addNewPortfolioItem;

        async function addNewShopItem() {
            const nameEl = document.getElementById('shop-new-name');
            const priceEl = document.getElementById('shop-new-price');
            const name = nameEl ? nameEl.value.trim() : '';
            const price = priceEl ? priceEl.value.trim() : '';
            const fileInput = document.getElementById('shop-new-file');

            if (!name || !price) { alert('Пожалуйста, заполните название и цену товара!'); return; }
            if (!fileInput || fileInput.files.length === 0) { alert('Пожалуйста, выберите фотографию товара!'); return; }

            try{
                const file = fileInput.files[0];
                const uploadedUrl = await uploadFileToSupabase(file, 'shop');
                if(!uploadedUrl) throw new Error('Загрузка не удалась');

                const priceNum = parseFloat(price.replace(/[^\d.]/g,''));
                const payload = {
                    name,
                    title: name,
                    price: isNaN(priceNum) ? null : priceNum,
                    image_url: uploadedUrl,
                    available: true
                };
                const { error } = await sb.from('shop').insert(payload);
                if(error) throw error;

                showToast('Товар добавлен в Supabase');
                if(nameEl) nameEl.value='';
                if(priceEl) priceEl.value='';
                fileInput.value='';
                await initSite();
            }catch(e){
                console.error(e);
                alert('Ошибка: '+e.message);
                showToast(e.message, true);
            }
        }
        window.addNewShopItem = addNewShopItem;

        // === Storage auto-cleanup helpers ===
        function getSupabaseStoragePath(url){
            if(!url || typeof url !== 'string') return null;
            try{
                const marker = `/object/public/${BUCKET}/`;
                const i = url.indexOf(marker);
                if(i === -1) return null;
                return decodeURIComponent(url.substring(i + marker.length).split('?')[0]);
            }catch(e){ return null; }
        }
        async function deleteStorageFileByUrl(url){
            const path = getSupabaseStoragePath(url);
            if(!path) return {skipped:true, reason:'not a supabase storage url'};
            try{
                const { data, error } = await sb.storage.from(BUCKET).remove([path]);
                if(error) throw error;
                return {ok:true, path};
            }catch(e){
                console.warn('storage delete failed', path, e);
                return {ok:false, error:e.message, path};
            }
        }

        window.deletePortfolioItem = async function(index) {
            const item = portfolioItems[index];
            if(!item) return;
            const imgInfo = item.img ? "\n" + item.img : "";
            if (!confirm('Удалить эту работу из портфолио?\nФайл изображения также будет удалён из Supabase Storage.' + imgInfo)) return;
            try{
                if(item.img){
                    const delRes = await deleteStorageFileByUrl(item.img);
                    if(delRes.ok){
                        showToast('Файл удалён из Storage: '+delRes.path);
                    }
                }
                if(item.id && !String(item.id).startsWith('local-')){
                    const { error } = await sb.from('portfolio').delete().eq('id', item.id);
                    if(error) throw error;
                } else {
                    portfolioItems.splice(index, 1);
                    localStorage.setItem('t_portfolio', JSON.stringify(portfolioItems));
                }
                showToast('Удалено из портфолио ✓');
                await initSite();
            }catch(e){
                alert('Ошибка удаления: '+e.message);
                showToast(e.message, true);
            }
        };

        window.deleteShopItem = async function(index) {
            const item = shopItems[index];
            if(!item) return;
            const imgInfo = item.img ? "\n" + item.img : "";
            if (!confirm('Удалить товар из магазина?\nИзображение будет удалено из Supabase Storage.' + imgInfo)) return;
            try{
                if(item.img){
                    const delRes = await deleteStorageFileByUrl(item.img);
                    if(delRes.ok){ showToast('Файл товара удалён: '+delRes.path); }
                }
                if(item.id && !String(item.id).startsWith('local-')){
                    const { error } = await sb.from('shop').delete().eq('id', item.id);
                    if(error) throw error;
                } else {
                    shopItems.splice(index,1);
                    localStorage.setItem('t_shop', JSON.stringify(shopItems));
                }
                showToast('Товар удалён ✓');
                await initSite();
            }catch(e){
                alert('Ошибка удаления: '+e.message);
                showToast(e.message, true);
            }
        };

        let replaceTargetIndex = null;
        window.triggerReplaceImage = function(index) {
            replaceTargetIndex = index;
            const inp = document.getElementById('replace-file-input');
            if(inp) inp.click();
        };

        document.addEventListener('DOMContentLoaded', ()=>{
            const rep = document.getElementById('replace-file-input');
            if(rep) rep.addEventListener('change', async function(e) {
                if (replaceTargetIndex === null || e.target.files.length === 0) return;
                const file = e.target.files[0];
                const item = portfolioItems[replaceTargetIndex];
                try{
                    const uploadedUrl = await uploadFileToSupabase(file, 'portfolio');
                    if(!uploadedUrl) throw new Error('upload failed');
                    if(item && item.id && !String(item.id).startsWith('local-')){
                        const { error } = await sb.from('portfolio').update({ image_url: uploadedUrl }).eq('id', item.id);
                        if(error) throw error;
                    }
                    showToast('Картинка заменена ✓');
                    await initSite();
                }catch(err){ alert('Ошибка: '+err.message); showToast(err.message,true);}
                replaceTargetIndex = null;
                e.target.value = '';
            });
        });

        let replaceShopTargetIndex = null;
        window.triggerReplaceShopImage = function(index) {
            replaceShopTargetIndex = index;
            const inp = document.getElementById('replace-shop-file-input');
            if(inp) inp.click();
        };

        document.addEventListener('DOMContentLoaded', ()=>{
            const repShop = document.getElementById('replace-shop-file-input');
            if(repShop) repShop.addEventListener('change', async function(e) {
                if (replaceShopTargetIndex === null || e.target.files.length === 0) return;
                const file = e.target.files[0];
                const item = shopItems[replaceShopTargetIndex];
                try{
                    const uploadedUrl = await uploadFileToSupabase(file, 'shop');
                    if(item && item.id && !String(item.id).startsWith('local-')){
                        const { error } = await sb.from('shop').update({ image_url: uploadedUrl }).eq('id', item.id);
                        if(error) throw error;
                    }
                    showToast('Фото товара заменено');
                    await initSite();
                }catch(err){ alert(err.message); }
                replaceShopTargetIndex = null;
                e.target.value = '';
            });
        });

        window.triggerReplaceAboutImage = function() {
            const inp = document.getElementById('replace-about-file-input');
            if(inp) inp.click();
        };

        document.addEventListener('DOMContentLoaded', ()=>{
            const aboutInp = document.getElementById('replace-about-file-input');
            if(aboutInp) aboutInp.addEventListener('change', async function(e) {
                if (e.target.files.length === 0) return;
                const file = e.target.files[0];
                try{
                    const uploadedUrl = await uploadFileToSupabase(file, 'about');
                    try{
                        const { data: oldAv } = await sb.from('site_settings').select('value').eq('key','about_avatar_url').maybeSingle();
                        if(oldAv?.value && oldAv.value !== uploadedUrl){
                            const oldPath = (function(u){
                                try{
                                    const marker = `/object/public/${BUCKET}/`;
                                    const i = u.indexOf(marker);
                                    return i===-1?null:decodeURIComponent(u.substring(i+marker.length).split('?')[0]);
                                }catch(e){return null}
                            })(oldAv.value);
                            if(oldPath) await sb.storage.from(BUCKET).remove([oldPath]);
                        }
                    }catch(_){}
                    const { error: upErr } = await sb.from('site_settings')
                      .upsert({ key: 'about_avatar_url', value: uploadedUrl }, { onConflict: 'key' });
                    if(upErr) throw upErr;
                    const aboutImg = document.getElementById('about-img');
                    if(aboutImg) aboutImg.src = uploadedUrl;
                    localStorage.setItem('t_about_img', uploadedUrl);
                    showToast('Фото автора обновлено в Supabase ✓');
                }catch(err){
                    showToast('Ошибка: '+err.message, true);
                    alert('Ошибка обновления аватара: '+err.message);
                }
                e.target.value = '';
            });
        });

        /* ===== REORDER: DRAG MODE ===== */
        let dragSrcIndex = null;

        function toggleDragMode() {
            if(reorderMode === 'drag'){
                reorderMode = null;
            } else {
                reorderMode = 'drag';
                swapSelectedIndex = null;
            }
            updateReorderUI();
            renderPortfolioGrid();
        }
        window.toggleDragMode = toggleDragMode;

        function attachDragListeners() {
            const cards = document.querySelectorAll('#port-grid .card-tuch');
            const grid = document.getElementById('port-grid');
            if(!grid || !cards.length) return;

            cards.forEach(card => {
                card.setAttribute('draggable', 'true');

                card.addEventListener('dragstart', function(e) {
                    dragSrcIndex = parseInt(this.dataset.index);
                    this.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', dragSrcIndex);
                });

                card.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                    document.querySelectorAll('#port-grid .card-tuch').forEach(c => c.classList.remove('drag-over'));
                    dragSrcIndex = null;
                });

                card.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    this.classList.add('drag-over');
                });

                card.addEventListener('dragleave', function() {
                    this.classList.remove('drag-over');
                });

                card.addEventListener('drop', function(e) {
                    e.preventDefault();
                    this.classList.remove('drag-over');
                    const targetIndex = parseInt(this.dataset.index);
                    if(dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
                        swapPortfolioItems(dragSrcIndex, targetIndex);
                    }
                });
            });
        }

        /* ===== REORDER: SWAP MODE (click-based) ===== */
        function toggleSwapMode() {
            if(reorderMode === 'swap'){
                reorderMode = null;
                swapSelectedIndex = null;
            } else {
                reorderMode = 'swap';
                swapSelectedIndex = null;
            }
            updateReorderUI();
            renderPortfolioGrid();
        }
        window.toggleSwapMode = toggleSwapMode;

        function attachSwapListeners() {
            const cards = document.querySelectorAll('#port-grid .card-tuch');
            cards.forEach(card => {
                card.addEventListener('click', handleSwapClick);
            });
        }

        function handleSwapClick(e) {
            // Ignore clicks on admin overlay buttons
            if(e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

            const card = e.currentTarget;
            const clickedIndex = parseInt(card.dataset.index);

            if(swapSelectedIndex === null) {
                // First selection
                swapSelectedIndex = clickedIndex;
                card.classList.add('swap-selected');
                updateReorderHint('Теперь нажмите на вторую картинку для обмена местами');
            } else if(swapSelectedIndex === clickedIndex) {
                // Deselect
                swapSelectedIndex = null;
                card.classList.remove('swap-selected');
                updateReorderHint('');
            } else {
                // Second selection → swap!
                const firstCard = document.querySelector(`#port-grid .card-tuch[data-index="${swapSelectedIndex}"]`);
                if(firstCard) firstCard.classList.remove('swap-selected');

                swapPortfolioItems(swapSelectedIndex, clickedIndex);
                swapSelectedIndex = null;
            }
        }

        function swapPortfolioItems(idxA, idxB) {
            if(idxA === idxB) return;
            if(idxA < 0 || idxB < 0 || idxA >= portfolioItems.length || idxB >= portfolioItems.length) return;

            // Animate
            const cardA = document.querySelector(`#port-grid .card-tuch[data-index="${idxA}"]`);
            const cardB = document.querySelector(`#port-grid .card-tuch[data-index="${idxB}"]`);
            if(cardA) cardA.classList.add('swap-animating');
            if(cardB) cardB.classList.add('swap-animating');

            // Swap in array
            const temp = portfolioItems[idxA];
            portfolioItems[idxA] = portfolioItems[idxB];
            portfolioItems[idxB] = temp;

            // Update sort_order locally
            const tmpOrder = portfolioItems[idxA].sort_order;
            portfolioItems[idxA].sort_order = portfolioItems[idxB].sort_order;
            portfolioItems[idxB].sort_order = tmpOrder;

            orderDirty = true;
            showSaveButton(true);
            showToast('Картинки поменяны местами! Нажмите «Сохранить порядок» 💾');

            // Re-render after animation
            setTimeout(() => {
                renderPortfolioGrid();
            }, 450);
        }

        /* ===== DETECT sort_order SUPPORT ===== */
        let hasSortOrder = false; // set to true once we confirm the column exists

        async function detectSortOrderColumn(){
            try{
                // Try a harmless select with sort_order
                const { error } = await sb.from('portfolio')
                  .select('id, sort_order')
                  .limit(1);
                if(error){
                    if(error.message && error.message.includes('sort_order')){
                        hasSortOrder = false;
                        console.warn('sort_order column does not exist yet.');
                        return false;
                    }
                }
                hasSortOrder = true;
                return true;
            }catch(e){
                hasSortOrder = false;
                return false;
            }
        }

        /* ===== SAVE ORDER TO SUPABASE ===== */
        async function savePortfolioOrder() {
            const btn = document.getElementById('btn-save-order');
            if(btn) btn.innerHTML = '<span class="loader"></span> Сохранение...';

            // Check if sort_order column exists
            if(!hasSortOrder){
                const ok = await detectSortOrderColumn();
                if(!ok){
                    // Save locally
                    portfolioItems.forEach((item, i) => { item.sort_order = i; });
                    localStorage.setItem('t_portfolio', JSON.stringify(portfolioItems));
                    orderDirty = false;
                    showSaveButton(false);
                    if(btn) btn.innerHTML = '💾 Сохранить порядок';

                    // Show migration instructions
                    const msg = '⚠️ В таблице portfolio нет колонки sort_order!\n\n' +
                        'Откройте Supabase Dashboard → SQL Editor и выполните:\n\n' +
                        'ALTER TABLE portfolio ADD COLUMN sort_order INTEGER DEFAULT 0;\n\n' +
                        'После этого нажмите «Сохранить порядок» ещё раз.';
                    alert(msg);
                    showToast('Нет колонки sort_order — порядок сохранён локально', true);
                    return;
                }
            }

            try {
                // Assign sequential sort_order values based on current array position
                const updates = [];
                portfolioItems.forEach((item, i) => {
                    item.sort_order = i;
                    if(item.id && !String(item.id).startsWith('local-')) {
                        updates.push({ id: item.id, sort_order: i });
                    }
                });

                if(updates.length > 0) {
                    // Batch update each item's sort_order
                    const promises = updates.map(u =>
                        sb.from('portfolio').update({ sort_order: u.sort_order }).eq('id', u.id)
                    );
                    const results = await Promise.all(promises);
                    const firstErr = results.find(r => r.error);
                    if(firstErr) throw firstErr.error;
                }

                // Also save to localStorage as fallback
                localStorage.setItem('t_portfolio', JSON.stringify(portfolioItems));

                orderDirty = false;
                showSaveButton(false);
                showToast('Порядок сохранён в Supabase ✓');
            } catch(e) {
                console.error('Save order error:', e);
                // Save locally even if Supabase fails
                localStorage.setItem('t_portfolio', JSON.stringify(portfolioItems));
                showToast('Ошибка: '+e.message+' (порядок сохранён локально)', true);
            }

            if(btn) btn.innerHTML = '💾 Сохранить порядок';
        }
        window.savePortfolioOrder = savePortfolioOrder;

        function showSaveButton(show) {
            const btn = document.getElementById('btn-save-order');
            if(btn) btn.style.display = show ? 'inline-block' : 'none';
        }

        function updateReorderUI() {
            const bar = document.getElementById('reorder-bar');
            const btnDrag = document.getElementById('btn-toggle-drag');
            const btnSwap = document.getElementById('btn-toggle-swap');
            const section = document.getElementById('portfolio');

            // Reset classes
            if(section) {
                section.classList.remove('reorder-active', 'swap-active');
            }
            if(btnDrag) {
                btnDrag.style.background = '';
                btnDrag.style.color = '';
            }
            if(btnSwap) {
                btnSwap.style.background = '';
                btnSwap.style.color = '';
            }

            if(reorderMode === 'drag') {
                if(section) section.classList.add('reorder-active');
                if(btnDrag) { btnDrag.style.background = '#CBE857'; btnDrag.style.color = '#323843'; }
                updateReorderHint('Перетаскивайте карточки для изменения порядка');
            } else if(reorderMode === 'swap') {
                if(section) section.classList.add('swap-active');
                if(btnSwap) { btnSwap.style.background = '#FFD700'; btnSwap.style.color = '#323843'; }
                updateReorderHint('Нажмите на первую картинку для выбора');
            } else {
                updateReorderHint('');
            }
        }

        function updateReorderHint(text) {
            const hint = document.getElementById('reorder-hint');
            if(hint) hint.innerHTML = text ? `<strong>💡</strong> ${text}` : '';
        }

        /* ===== Лайтбокс ===== */
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxCounter = document.getElementById('lightbox-counter');
        let lightboxList = [];
        let lightboxIndex = 0;

        function getVisibleImagesInContext(currentSrc) {
            const list = [];
            const isInPortfolio = Array.from(document.querySelectorAll('#port-grid img')).some(img => img.src === currentSrc);
            if (isInPortfolio) {
                document.querySelectorAll('#port-grid img').forEach(img => { list.push(img.src); });
                return list;
            }
            const isInShop = Array.from(document.querySelectorAll('#shop-grid img')).some(img => img.src === currentSrc);
            if (isInShop) {
                document.querySelectorAll('#shop-grid img').forEach(img => { list.push(img.src); });
                return list;
            }
            return [currentSrc];
        }

        function openLightbox(src) {
            // Don't open lightbox in swap/drag mode
            if(reorderMode) return;
            if (isAdmin && event && event.target.tagName === 'BUTTON') return;
            lightboxList = getVisibleImagesInContext(src);
            lightboxIndex = Math.max(0, lightboxList.indexOf(src));
            updateLightbox();
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        window.openLightbox = openLightbox;

        function updateLightbox() {
            if (!lightboxList.length) return;
            lightboxImg.src = lightboxList[lightboxIndex];
            const multiple = lightboxList.length > 1;
            lightboxCounter.style.display = multiple ? '' : 'none';
            document.getElementById('lightbox-prev').style.display = multiple ? '' : 'none';
            document.getElementById('lightbox-next').style.display = multiple ? '' : 'none';
            lightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxList.length}`;
        }

        function closeLightbox() {
            lightbox.classList.remove('open');
            document.body.style.overflow = '';
        }

        function lightboxStep(dir) {
            if (!lightboxList.length) return;
            lightboxIndex = (lightboxIndex + dir + lightboxList.length) % lightboxList.length;
            updateLightbox();
        }

        document.addEventListener('DOMContentLoaded', ()=>{
            const pg = document.getElementById('port-grid');
            if(pg) pg.addEventListener('click', e => {
                // In swap mode, don't open lightbox
                if(reorderMode) return;
                const img = e.target.closest('img');
                if (img && (!isAdmin || e.target.tagName !== 'BUTTON')) {
                    openLightbox(img.src);
                }
            });
            const sg = document.getElementById('shop-grid');
            if(sg) sg.addEventListener('click', e => {
                const img = e.target.closest('img');
                if (img && (!isAdmin || e.target.tagName !== 'BUTTON')) {
                    openLightbox(img.src);
                }
            });
            // Close lightbox by clicking on the background (not on image or buttons)
            if(lightbox) lightbox.addEventListener('click', e => {
                if (e.target === lightbox) closeLightbox();
            });
        });

        document.addEventListener('keydown', e => {
            if (!lightbox || !lightbox.classList.contains('open')) return;
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') lightboxStep(-1);
            else if (e.key === 'ArrowRight') lightboxStep(1);
        });

        // меню
        document.addEventListener('DOMContentLoaded', ()=>{
            const menuBtn = document.getElementById('menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            let menuOpen = false;
            if(menuBtn && mobileMenu){
                menuBtn.addEventListener('click', () => {
                    menuOpen = !menuOpen;
                    if (menuOpen) {
                        mobileMenu.classList.remove('-translate-y-4', 'opacity-0', 'pointer-events-none');
                        menuBtn.children[0].classList.add('rotate-45', 'translate-y-2');
                        menuBtn.children[1].classList.add('opacity-0');
                        menuBtn.children[2].classList.add('-rotate-45', '-translate-y-2');
                    } else {
                        mobileMenu.classList.add('-translate-y-4', 'opacity-0', 'pointer-events-none');
                        menuBtn.children[0].classList.remove('rotate-45', 'translate-y-2');
                        menuBtn.children[1].classList.remove('opacity-0');
                        menuBtn.children[2].classList.remove('-rotate-45', '-translate-y-2');
                    }
                });
                document.querySelectorAll('.menu-link').forEach(link => {
                    link.addEventListener('click', () => {
                        menuOpen = false;
                        mobileMenu.classList.add('-translate-y-4', 'opacity-0', 'pointer-events-none');
                        menuBtn.children[0].classList.remove('rotate-45', 'translate-y-2');
                        menuBtn.children[1].classList.remove('opacity-0');
                        menuBtn.children[2].classList.remove('-rotate-45', '-translate-y-2');
                    });
                });
            }
        });

        window.onload = initSite;
