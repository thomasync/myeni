const puppeteer = require('puppeteer');
const fs = require('fs');
const fsExtra = require('fs-extra');
const PDFMerger = require('pdf-merger-js');
const parser = require('node-html-parser');
const epub = require('epub-gen');
const request = require('request');
const readline = require("readline");


const cookies = [];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Cookies: ", (arg_cookies) => {
    arg_cookies = arg_cookies.replace(/"/g, "").replace(/\s/g, "").split(";")
    arg_cookies.forEach((arg_cookie) => {
        arg_cookie = arg_cookie.match(/(.*?)=(.*)/);
        cookies.push({
            name: arg_cookie[1].trim(),
            value: arg_cookie[2].trim()
        });
    });
    rl.question("Id du livre: ", (arg_id) => {
        rl.question("Télécharger en quel format ? [epub/pdf]: ", (arg_type) => {
            try {
                downloadBook(arg_id, arg_type);
            }
            catch(ex) {
                console.log('Une erreur est survenue.');
            }
        });
    });
});

async function downloadBook(bookID, type="pdf") {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://www.eni-training.com/');
    await page.setCookie(...cookies);
    await page.goto('http://www.eni-training.com/client_net/mediabook.aspx?idR=' + bookID);

    const [name, isbn, ids] = await page.evaluate(() => {
        ids = [];
        document.querySelectorAll('ul#Root li:not(.quiz)').forEach((elem) => {
            if(elem.id.match(/S_[0-9]+/)) ids.push(+elem.id.replace('S_','')); 
        });
        
        let isbn = null;
        if(document.querySelector('.Infos') && document.querySelector('.Infos').innerText.match('ISBN : (.*)')) {
            isbn = document.querySelector('.Infos').innerText.match('ISBN : (.*)')[1];
        }

        let name = null;
        if(document.querySelector("#Menu strong")) {
            name = document.querySelector("#Menu strong").innerText;
        }

        if(ids.length < 3 || !name) {
            throw new Error('Une erreur est survenue');
        }

        return Promise.resolve([name, isbn, ids]);
    });

    fsExtra.emptyDirSync('tmp');

    for (const [index, id] of ids.entries()){
        await page.evaluate((id) => {
            window._r = id;
            eni.sc.ck.s('__hnwky', $.now(), 1);
            eni.sc.ck.s('__rsaxc', window._r, 1);
            document.querySelector('#S_' + window._r).click();
            return Promise.resolve();
        }, id);

        // Le temps que la page charge
        await new Promise(function(resolve) {setTimeout(resolve, 1500)});

        const pageDL = await browser.newPage();
        await pageDL.goto('http://www.eni-training.com/client_net/pdfexport.aspx?exporttype=1');
        
        if(type === "epub") {
            await dlEPUB(pageDL, id);
        } else {
            await dlPDF(pageDL, id);
        }

        // Le temps de DL et de passer à la page suivante
        await new Promise(function(resolve) {setTimeout(resolve, 500)});
        console.log((index + 1) + "/" + ids.length);
    }

    if(type === "epub") {
        await createEPUB(name, isbn);
    } else {
        await mergePDF(name);
    }
    fsExtra.emptyDirSync('tmp');
    await browser.close();
    console.log("\n Votre livre a été téléchargé, il se trouve ici : result/" + name + "." + type);
}

async function dlEPUB(page, id) {
    let content = await page.content();
    content = content.replace(/src=(|\"|\')\.\.\//g, 'src=$1http://www.eni-training.com/');
    
    content = content.replace('width:99%;', 'width:calc(100% - 24px);');
    content = content.replace("<body><div", "<body><div style='padding:25px'");

    fs.writeFileSync('tmp/' + id + '.html', content);
    page.close();
}

async function createEPUB(name, isbn) {

    const options = {
        title: name,
        output: 'result/' + name + '.epub',
        css: '',
        appendChapterTitles: false,
        tocTitle: 'Sommaire',
        content: []
    };

    const cover = await getCover(isbn);
    if(cover) {
        options.cover = cover;
    }

    let first = 0;
    fs.readdirSync('tmp').forEach(file => {
        const html = parser.parse(fs.readFileSync('tmp/' + file,'utf8'));

        if(!first) {
            html.querySelectorAll('style').forEach((style) => {
                options.css += style.innerHTML;
            });
            first = 1;
        }
        
        html.querySelectorAll('var').forEach((element) => {
            element.remove();
        });

        const title = html.querySelector('h1.title').innerText;
        //html.querySelector('h1.title').remove();

        options.content.push({
            title,
            data: html.querySelector('body').innerHTML,
        });
        
    });
    if (!fs.existsSync('result')){
        fs.mkdirSync('result');
    }
    new epub(options).promise.then(() => {
        return Promise.resolve();
    });
}

async function dlPDF(page, id) {
    await page.evaluate(() => {
        document.querySelectorAll('.MEDIABook_CallBack_PrgContent_Container .programlisting').forEach((elem) => {
            elem.style.width = "calc(100% - 24px)";
        });
        return Promise.resolve();
    });
    
    await page.pdf({path: 'tmp/' + id + '.pdf', format: 'A4', margin: { left: '2cm', top: '2cm', right: '2cm', bottom: '2cm' }});
    page.close();
}

async function mergePDF(name) {
    const merger = new PDFMerger();
    fs.readdirSync('tmp').forEach(file => {
        merger.add('tmp/' + file);
    });
    if (!fs.existsSync('result')){
        fs.mkdirSync('result');
    }
    await merger.save('result/' + name + '.pdf');
}

async function getCover(isbn) {

    const options = {
        url: 'https://www.editions-eni.fr/ajax/search.prvw.aspx',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Accept': 'text/html, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://www.editions-eni.fr'
        },
        body: 'exp=' + isbn
    };
    
    return new Promise((resolve) => {
        request(options, (error, response, body) => {
            const html = parser.parse(body);
            try {
                let url = html.querySelector('img').attributes['src'];
                url = url.replace(/^\/\//, 'https://');
                url = url.replace(/\_S\./, '_XL.');
                resolve(url);
            } catch(ex) {
                resolve(null);
            }
        });
    });
    
}