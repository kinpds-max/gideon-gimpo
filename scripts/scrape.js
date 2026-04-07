const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const HOME_URL = 'https://kgideons.org/';
const NEWS_URL = 'https://kgideons.org/bbs/board.php?bo_table=B14';
const VIDEO_URL = 'https://kgideons.org/bbs/board.php?bo_table=B03';

async function scrape() {
    console.log('🚀 크롤링 시작...');

    try {
        const [newsData, videoData, statsData] = await Promise.all([
            scrapeNews(),
            scrapeVideos(),
            scrapeStats()
        ]);

        const result = {
            news: newsData,
            videos: videoData,
            stats: statsData,
            updatedAt: new Date().toISOString()
        };

        const dataPath = path.join(__dirname, '../data/data.json');
        fs.writeFileSync(dataPath, JSON.stringify(result, null, 2));
        console.log('✅ data/data.json 업데이트 완료!');
        console.log('📊 현황 데이터:', JSON.stringify(statsData, null, 2));
        console.log('📰 뉴스:', newsData.length + '건');
        console.log('🎬 영상:', videoData.length + '건');
    } catch (error) {
        console.error('❌ 크롤링 실패:', error.message);
    }
}

async function scrapeStats() {
    console.log('📊 현황 데이터 수집 중...');
    const { data } = await axios.get(HOME_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    const $ = cheerio.load(data);

    const stats = {
        international: {
            memberCountries: '',
            languages: '',
            gideons: '',
            auxiliaries: '',
            bibleDistributed: ''
        },
        korea: {
            camps: '',
            language: '',
            gideons: '',
            auxiliaries: '',
            bibleDistributed: ''
        }
    };

    // 국제·한국 기드온 현황 섹션 파싱
    // 홈페이지의 통계 섹션 - 다양한 선택자 시도
    const statSection = $('#visual_gideon, .gideon_status, .status_wrap, .state_wrap, section.visual');

    // 대안: 숫자 패턴으로 직접 추출
    // 텍스트에서 숫자 추출 방식
    const allText = $.html();

    // 국제기드온 현황 숫자 패턴 추출 (이미지에서 확인된 데이터)
    // 정규식으로 HTML에서 통계 섹션 파싱
    const intlMatch = allText.match(/회원국[^0-9]*(\d[\d,]*)[^0-9]*언어[^0-9]*(\d[\d,]*)[^0-9]*기드온[^0-9]*(\d[\d,]*)[^0-9]*부인회원[^0-9]*(\d[\d,]*)[^0-9]*성경배부[^0-9]*(\d[\d,]*)/s);
    if (intlMatch) {
        stats.international.memberCountries = intlMatch[1];
        stats.international.languages = intlMatch[2];
        stats.international.gideons = intlMatch[3];
        stats.international.auxiliaries = intlMatch[4];
        stats.international.bibleDistributed = intlMatch[5];
    }

    // 모든 숫자 포함 요소 찾기 시도
    let statItems = [];
    $('[class*="num"], [class*="count"], [class*="stat"], .num_wrap span, .count_wrap span').each((i, el) => {
        const text = $(el).text().trim();
        if (text && /[\d,]+/.test(text)) {
            statItems.push(text);
        }
    });

    // 직접 HTML 파싱 - 숫자 텍스트 노드 추출
    if (statItems.length === 0) {
        // 대형 숫자가 있는 dt/dd 또는 span 찾기
        $('dt, dd, strong, b, .num').each((i, el) => {
            const text = $(el).text().trim().replace(/[\s\n]+/g, '');
            if (/^[\d,]+$/.test(text) && text.length > 2) {
                statItems.push(text);
            }
        });
    }

    console.log('발견된 통계 항목:', statItems);

    // 이미지에서 직접 확인된 데이터를 기본값으로 사용 (HTML 추출 실패시)
    // 실제 크롤링된 데이터로 업데이트
    if (!stats.international.memberCountries) {
        // 직접 HTML 파싱 시도 2 - 텍스트 기반 순서 추출
        let nums = [];
        $('*').each((i, el) => {
            const ownText = $(el).children().length === 0 ? $(el).text().trim() : '';
            if (/^[\d,]+$/.test(ownText) && parseInt(ownText.replace(/,/g, '')) > 99) {
                nums.push(ownText);
            }
        });

        // 순서대로 국제 / 한국 현황에 매핑 시도
        if (nums.length >= 10) {
            stats.international.memberCountries = nums[0];
            stats.international.languages = nums[1];
            stats.international.gideons = nums[2];
            stats.international.auxiliaries = nums[3];
            stats.international.bibleDistributed = nums[4];
            stats.korea.camps = nums[5];
            stats.korea.gideons = nums[7];
            stats.korea.auxiliaries = nums[8];
            stats.korea.bibleDistributed = nums[9];
        }
    }

    // 언어는 텍스트이므로 별도 추출
    stats.korea.language = '개역개정';

    return stats;
}

async function scrapeNews() {
    console.log('📰 소식 크롤링 중...');
    const { data } = await axios.get(NEWS_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);
    const list = [];

    // 다양한 선택자 시도
    const selectors = ['li.gall_li', 'li.bo_notice', '.bo_list li', 'tr.bo_notice, tr.bo_list_li'];

    for (const sel of selectors) {
        if ($(sel).length > 0) {
            $(sel).each((i, el) => {
                if (i >= 5) return false;
                const titleEl = $(el).find('a.bo_tit, .bo_tit a, a[href*="wr_id"]').first();
                const title = titleEl.text().trim();
                const link = titleEl.attr('href');
                const date = $(el).find('.td_datetime, .gall_date, time').text().trim();
                if (title) list.push({ title, link, date });
            });
            break;
        }
    }

    // 홈페이지 최신 간증 목록도 추가 파싱
    if (list.length === 0) {
        const homeRes = await axios.get(HOME_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $home = cheerio.load(homeRes.data);
        $home('a[href*="bo_table=B14"]').each((i, el) => {
            if (i >= 4) return false;
            const title = $home(el).text().trim();
            const link = $home(el).attr('href');
            if (title && title.length > 5 && link && link.includes('wr_id')) {
                list.push({ title, link, date: '' });
            }
        });
    }

    console.log(`  → ${list.length}건 수집`);
    return list;
}

async function scrapeVideos() {
    console.log('🎬 영상 크롤링 중...');
    const { data } = await axios.get(VIDEO_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);
    const list = [];

    $('li.gall_li').each((i, el) => {
        if (i >= 6) return false;
        const title = $(el).find('a.bo_tit').text().trim();
        const link = $(el).find('a.bo_tit').attr('href');
        const thumbnail = $(el).find('div.gall_img img').attr('src');

        if (title) list.push({ title, link, thumbnail });
    });

    // 유튜브 링크 추출 (기드온 공식 유튜브)
    if (list.length === 0) {
        // 기본 영상 데이터
        list.push(
            { title: '국제기드온협회 사역소개 영상', thumbnail: 'https://img.youtube.com/vi/rUkAtQ4a4zw/maxresdefault.jpg', link: 'https://www.youtube.com/watch?v=rUkAtQ4a4zw', videoId: 'rUkAtQ4a4zw' },
            { title: '국내 6천만 권 성경배부 기념 영상', thumbnail: 'https://img.youtube.com/vi/IEno3KcFUqg/maxresdefault.jpg', link: 'https://www.youtube.com/watch?v=IEno3KcFUqg', videoId: 'IEno3KcFUqg' },
            { title: '국제기드온협회 히스토리 영상', thumbnail: 'https://img.youtube.com/vi/d01fnKVMLUA/maxresdefault.jpg', link: 'https://www.youtube.com/watch?v=d01fnKVMLUA', videoId: 'd01fnKVMLUA' },
            { title: '교회순방영상', thumbnail: 'https://img.youtube.com/vi/SlG4XqpivwE/maxresdefault.jpg', link: 'https://www.youtube.com/watch?v=SlG4XqpivwE', videoId: 'SlG4XqpivwE' }
        );
    }

    console.log(`  → ${list.length}건 수집`);
    return list;
}

scrape();
