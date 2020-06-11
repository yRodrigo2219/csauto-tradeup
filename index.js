const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const COLOR = {
    RED: '\x1b[31m%s\x1b[0m',
    GREEN: '\x1b[32m%s\x1b[0m',
    CYAN: '\x1b[36m%s\x1b[0m'
};

function delay(ms) {
    return new Promise(resolve => {
        setTimeout(_ => resolve(), ms);
    });
}

function updateSkin(skinName, skinLink) {
    return new Promise((resolve, reject) => {
        const skin = {
            name: skinName,
            link: skinLink,
            minWear: 0.0,
            maxWear: 0.0,
            'stat-track': {},
            normal: {}
        };

        axios.get(skinLink, {timeout: 2000}).then(res => {
            const $ = cheerio.load(res.data);

            let wears = $('.marker-value.cursor-default').toArray();
            skin.minWear = Number.parseFloat($(wears[0]).text());
            skin.maxWear = Number.parseFloat($(wears[1]).text());

            $('tbody').children().each((i, el) => {
                // forEach table-row
                let quality = $(el).children().first().text().replace(/\n/gi, '');
                let isST = quality.includes('StatTrak');
                let price = Number.parseFloat($(el).children().eq(3).text().replace(/\.|R\$ |\n/gi, '').replace(',', '.'));
                let volume = $(el).children().eq(4).text().replace(/\n/gi, '') | '0';

                // if unable to gather median price, get the lowest price
                !price ? price = Number.parseFloat($(el).children().eq(1).text().replace(/\.|R\$ |\n/gi, '').replace(',', '.')) : null;

                if (quality.includes('Factory New')) {
                    if (isST)
                        skin["stat-track"].FN = {
                            price,
                            volume
                        };
                    else
                        skin.normal.FN = {
                            price,
                            volume
                        };
                } else if (quality.includes('Minimal Wear')) {
                    if (isST)
                        skin["stat-track"].MW = {
                            price,
                            volume
                        };
                    else
                        skin.normal.MW = {
                            price,
                            volume
                        };
                } else if (quality.includes('Field-Tested')) {
                    if (isST)
                        skin["stat-track"].FT = {
                            price,
                            volume
                        };
                    else
                        skin.normal.FT = {
                            price,
                            volume
                        };
                } else if (quality.includes('Well-Worn')) {
                    if (isST)
                        skin["stat-track"].WW = {
                            price,
                            volume
                        };
                    else
                        skin.normal.WW = {
                            price,
                            volume
                        };
                } else if (quality.includes('Battle-Scarred')) {
                    if (isST)
                        skin["stat-track"].BS = {
                            price,
                            volume
                        };
                    else
                        skin.normal.BS = {
                            price,
                            volume
                        };
                } else {
                    reject();
                    return;
                }
            });

            fs.writeFile(`./data/skins/${skinName.replace('|','!')}.json`, JSON.stringify(skin), err => {
                if (err) {
                    reject();
                    return console.warn(COLOR.RED, `Error updating ${skinName}!`, err);
                }

                console.warn(COLOR.GREEN, `${skinName} updated successfuly!`)
                resolve(skin);
            });
        }).catch(err => {
            reject();
            console.warn(COLOR.RED, `Error updating ${skinName}!`, err);
        });
    });
}

function updateCase(caseName, caseLink) {
    return new Promise((resolve, reject) => {
        const c = { // case
            name: caseName,
            link: caseLink,
            skins: {}
        };

        axios.get(caseLink, {timeout: 2000}).then(res => {
            const $ = cheerio.load(res.data);

            $('.well.result-box.nomargin') // gets all items
                .not($('.quality.color-rare-item').parent()) // remove knives
                .not($('.abbu-body-resultbox').parent()) // remove ads
                .each((i, el) => {
                    if (!c.skins[$(el).find('.quality').attr('class').slice(14, )])
                        c.skins[$(el).find('.quality').attr('class').slice(14, )] = []
                    c.skins[$(el).find('.quality').attr('class').slice(14, )].push({
                        skinName: $(el).find('h3').text(),
                        skinLink: $(el).children('a').not('.nounderline').attr('href')
                    })
                });

            fs.writeFile(`./data/${caseName}.json`, JSON.stringify(c), err => {
                if (err) {
                    reject();
                    return console.warn(COLOR.RED, `Error updating ${caseName}!`, err);
                }

                console.warn(COLOR.GREEN, `\n* ${caseName} updated successfuly!`);
                resolve(c);
            });

        }).catch(err => {
            reject();
            console.warn(COLOR.RED, `Error updating ${caseName}!`, err);
        });
    });
}

function updateAllCases() {
    return new Promise((resolve, reject) => {
        const caseList = [];

        axios.get(`https://csgostash.com/containers/skin-cases`, {timeout: 2000}).then(res => {
            const $ = cheerio.load(res.data);

            // creates an object with all the cases names and links
            $('.well.result-box.nomargin') // get all cases
                .not($('.abbu-body-resultbox').parent()) // removes ads
                .each((i, el) => {
                    caseList.push({
                        caseName: $(el).find('h4').text(),
                        caseLink: $(el).find('a').attr('href')
                    });
                });

            fs.writeFile("./data/caseList.json", JSON.stringify(caseList), (err) => {
                if (err) {
                    reject();
                    return console.warn(COLOR.RED, 'Error updating Case list!', err);
                }

                console.warn(COLOR.GREEN, 'Case list successfuly updated!');
                resolve(caseList);
            });

        }).catch(err => {
            reject();
            console.warn(COLOR.RED, `Error updating Case list!`, err);
        });
    });

}

function syncCase(caseName, caseLink, tries = 5, ms = 10000) {
    if (tries <= 0)
        return Promise.reject(`Maximum tries on ${caseName}`);

    return updateCase(caseName, caseLink).then(async caseInfo =>{
        for (const quality in caseInfo.skins) { // forEach quality in the case
            for (const skin of caseInfo.skins[quality]) { // forEach skin in the quality
                await syncSkin(skin.skinName, skin.skinLink);
            }
        }
    }).catch(async _ => {
        await delay(ms);
        return syncCase(skinName, skinLink, tries - 1);
    });
}

function syncSkin(skinName, skinLink, tries = 5, ms = 10000) {
    if (tries <= 0)
        return Promise.reject(`Maximum tries on ${skinName}`);

    return updateSkin(skinName, skinLink).catch(async _ => {
        await delay(ms);
        return syncSkin(skinName, skinLink, tries - 1);
    });
}

function routineSyncWholeDB() {
    return new Promise(async resolve => {
        await updateAllCases().then(async caseList => {
            for (const c of caseList) { // forEach case in the list
                await syncCase(c.caseName, c.caseLink);
            }

            resolve();
        });
    });
}

routineSyncWholeDB();