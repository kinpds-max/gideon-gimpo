// Scroll Effect for Header
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Default Data for Robustness (Fixes CORS/file:// issues)
const DEFAULT_DATA = {
    "stats": {
        "international": {
            "memberCountries": "199",
            "languages": "110",
            "gideons": "157,133",
            "auxiliaries": "99,974",
            "bibleDistributed": "2,809,124,369"
        },
        "korea": {
            "camps": "125",
            "language": "개역개정",
            "gideons": "2,023",
            "auxiliaries": "1,258",
            "bibleDistributed": "60,581,925"
        }
    },
    "news": [
        { "title": "방황하던 내게 위로가 된 기드온성경", "date": "2024-04-02", "link": "https://kgideons.org/bbs/board.php?bo_table=B14&wr_id=161" },
        { "title": "담배 종이로 쓰이던 기드온성경, 생명의 전달자", "date": "2024-03-10", "link": "https://kgideons.org/bbs/board.php?bo_table=B14&wr_id=160" },
        { "title": "호주머니 속에 임하신 하나님의 나라", "date": "2024-02-09", "link": "https://kgideons.org/bbs/board.php?bo_table=B14&wr_id=159" }
    ],
    "videos": [
        { "title": "준비된 성경", "thumbnail": "https://img.youtube.com/vi/rUkAtQ4a4zw/maxresdefault.jpg", "link": "https://www.youtube.com/watch?v=rUkAtQ4a4zw" },
        { "title": "기드온 소개", "thumbnail": "https://img.youtube.com/vi/IEno3KcFUqg/maxresdefault.jpg", "link": "https://www.youtube.com/watch?v=IEno3KcFUqg" },
        { "title": "하나님의 말씀", "thumbnail": "https://img.youtube.com/vi/d01fnKVMLUA/maxresdefault.jpg", "link": "https://www.youtube.com/watch?v=d01fnKVMLUA" },
        { "title": "생명의 복음", "thumbnail": "https://img.youtube.com/vi/jUyidNXIAmM/maxresdefault.jpg", "link": "https://www.youtube.com/watch?v=jUyidNXIAmM" }
    ],
    "testimonies": [
        { "title": "간증영상 1", "thumbnail": "https://img.youtube.com/vi/isPbD3DG5Y8/maxresdefault.jpg", "link": "https://www.youtube.com/watch?v=isPbD3DG5Y8" },
        { "title": "간증영상 2", "thumbnail": "https://img.youtube.com/vi/u8qkFl1nfrA/maxresdefault.jpg", "link": "https://www.youtube.com/watch?v=u8qkFl1nfrA" },
        { "title": "간증영상 3", "thumbnail": "https://img.youtube.com/vi/ordaJzmpm3c/maxresdefault.jpg", "link": "https://www.youtube.com/watch?v=ordaJzmpm3c" },
        { "title": "간증영상 4", "thumbnail": "https://img.youtube.com/vi/spvna3FVPCU/maxresdefault.jpg", "link": "https://www.youtube.com/watch?v=spvna3FVPCU" }
    ],
    "meetingPhotos": [],
    "distributionPhotos": []
};

// Google Drive Integration
// Uses the Google Drive API v3 to load images from a public shared folder.
// The folder must be shared as "Anyone with the link can view".
// The folder ID comes from the share link: drive.google.com/drive/folders/FOLDER_ID_IS_HERE

const DRIVE_API_KEY = 'AIzaSyDemo_ReplaceWithYourAPIKey'; // ← 여기에 Google API 키 입력

async function loadDrivePhotos(galleryId, folderId) {
    folderId = folderId ? folderId.trim() : '';
    // Try to extract folder ID from a full URL if pasted
    const match = folderId.match(/[-\w]{25,}/);
    if (!match) {
        alert('올바른 구글 드라이브 폴더 ID 또는 링크를 입력해주세요.');
        return;
    }
    folderId = match[0];

    // Save to localStorage for persistence
    localStorage.setItem('drive_' + galleryId, folderId);

    const container = document.getElementById(galleryId);
    container.innerHTML = '<div class="drive-empty-state"><i class="fa-solid fa-spinner fa-spin fa-3x"></i><p>사진을 불러오는 중...</p></div>';

    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${DRIVE_API_KEY}&fields=files(id,name,mimeType)&pageSize=50`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Drive API error: ${res.status}`);
        const data = await res.json();

        if (!data.files || data.files.length === 0) {
            container.innerHTML = '<div class="drive-empty-state"><i class="fa-regular fa-image fa-3x"></i><p>폴더에 사진이 없거나 공유 설정을 확인해주세요.</p></div>';
            return;
        }

        container.innerHTML = '';
        data.files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'photo-item';
            item.style.animation = `fadeInUp 0.6s ${index * 0.05}s forwards`;
            item.style.opacity = '0';
            const imgUrl = `https://lh3.googleusercontent.com/d/${file.id}`;
            item.innerHTML = `
                <img src="${imgUrl}" alt="${file.name}" loading="lazy">
                <div class="photo-caption">${file.name.replace(/\.[^.]+$/, '')}</div>
            `;
            // Click to open full image
            item.addEventListener('click', () => {
                window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank');
            });
            item.style.cursor = 'pointer';
            container.appendChild(item);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="drive-empty-state"><i class="fa-solid fa-triangle-exclamation fa-3x" style="color:#e74c3c"></i><p>불러오기 실패: API 키를 확인하거나 폴더 공유 설정을 확인해주세요.<br><small>${err.message}</small></p></div>`;
    }
}

// Fetch and Render Data
async function loadData() {
    const newsContainer = document.getElementById('news-container');
    const videoContainer = document.getElementById('video-container');

    try {
        let data = DEFAULT_DATA;
        try {
            const response = await fetch('./data/data.json');
            if (response.ok) {
                data = await response.json();
            }
        } catch (e) {
            console.log("Loading local data instead of fetch");
        }

        renderNews(data.news);
        if (data.stats) renderStats(data.stats);
        if (videoContainer) renderVideos(data.videos);
        if (data.testimonies) renderTestimonies(data.testimonies);

        // Restore saved Drive folder IDs from previous session
        const savedMeeting = localStorage.getItem('drive_meeting-gallery');
        const savedDist = localStorage.getItem('drive_distribution-gallery');
        if (savedMeeting) {
            document.getElementById('meeting-folder-id').value = savedMeeting;
            loadDrivePhotos('meeting-gallery', savedMeeting);
        }
        if (savedDist) {
            document.getElementById('distribution-folder-id').value = savedDist;
            loadDrivePhotos('distribution-gallery', savedDist);
        }

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function renderGallery(id, photos) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';
    photos.forEach((photo, index) => {
        const item = document.createElement('div');
        item.className = 'photo-item';
        item.style.animation = `fadeInUp 0.8s ${index * 0.1}s forwards`;
        item.style.opacity = '0';
        item.innerHTML = `
            <img src="${photo.url}" alt="${photo.caption}">
            <div class="photo-caption">${photo.caption}</div>
        `;
        container.appendChild(item);
    });
}

function renderStats(stats) {
    if (!stats) return;

    // International
    document.getElementById('intl-countries').textContent = stats.international.memberCountries;
    document.getElementById('intl-languages').textContent = stats.international.languages;
    document.getElementById('intl-gideons').textContent = stats.international.gideons;
    document.getElementById('intl-aux').textContent = stats.international.auxiliaries;
    document.getElementById('intl-total').textContent = stats.international.bibleDistributed;

    // Korea
    document.getElementById('kor-camps').textContent = stats.korea.camps;
    document.getElementById('kor-languages').textContent = stats.korea.language || stats.korea.languages;
    document.getElementById('kor-gideons').textContent = stats.korea.gideons;
    document.getElementById('kor-aux').textContent = stats.korea.auxiliaries;
    document.getElementById('kor-total').textContent = stats.korea.bibleDistributed;
}

function renderNews(newsList) {
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = ''; // Clear skeleton

    newsList.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.style.animation = `fadeInUp 0.8s ${index * 0.1}s forwards`;
        card.style.opacity = '0';
        
        card.innerHTML = `
            <span class="date">${item.date}</span>
            <h3>${item.title}</h3>
            <a href="${item.link}" target="_blank">자세히 보기 <i class="fa-solid fa-arrow-right"></i></a>
        `;
        newsContainer.appendChild(card);
    });
}

function renderVideos(videoList) {
    const videoContainer = document.getElementById('video-container');
    if (!videoContainer) return;
    videoContainer.innerHTML = '';
    videoList.forEach((video, index) => {
        const ytMatch = video.link.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : '';
        const card = createVideoCard(video, ytId, index);
        videoContainer.appendChild(card);
    });
}

function renderTestimonies(videoList) {
    const testimonyContainer = document.getElementById('testimony-container');
    if (!testimonyContainer) return;
    testimonyContainer.innerHTML = '';
    videoList.forEach((video, index) => {
        const ytMatch = video.link.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
        const ytId = ytMatch ? ytMatch[1] : '';
        const card = createVideoCard(video, ytId, index);
        testimonyContainer.appendChild(card);
    });
}

function createVideoCard(video, ytId, index) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.style.animation = `fadeInUp 0.8s ${index * 0.1}s forwards`;
    card.style.opacity = '0';
    card.style.cursor = 'pointer';
    card.onclick = () => openYtModal(ytId);
    card.innerHTML = `
        <img src="${video.thumbnail}" alt="${video.title}">
        <div class="video-overlay">
            <h3>${video.title}</h3>
        </div>
        <div class="play-btn">
            <i class="fa-solid fa-play"></i>
        </div>
    `;
    return card;
}

// YouTube Modal
function openYtModal(ytId) {
    const modal = document.getElementById('yt-modal');
    const iframe = document.getElementById('yt-iframe');
    iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeYtModal() {
    const modal = document.getElementById('yt-modal');
    const iframe = document.getElementById('yt-iframe');
    iframe.src = '';
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function closeModal(e) {
    if (e.target === document.getElementById('yt-modal')) closeYtModal();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeYtModal();
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Add small delay to show off skeletons (optional)
    setTimeout(loadData, 800);
});

// Smooth scroll for nav links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        window.scrollTo({
            top: targetSection.offsetTop - 70,
            behavior: 'smooth'
        });
    });
});
