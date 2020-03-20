const fs = require('fs');
const ics = require('ics');
const calendar = require('./calendar');
const config = require('./config');

const NUMBERS = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12, 冬: 11, 腊: 12, 廿: 20, 卅: 30 };

function getNumberDate(str) {
  let date = str.split(/[年月]/);
  let hasYear = date.length === 3;
  let year = hasYear ? date[0] : '';
  let month = hasYear ? date[1] : date[0];
  let day = (hasYear ? date[2] : date[1]).replace(/初|号|日/g, '');
  return [
    +year.replace(/./g, v => NUMBERS[v]),
    +NUMBERS[month.replace('闰', '')],
    day.length === 1
      ? NUMBERS[day]
      : +day
          .replace(/(.)十(.)/, '$1$2')
          .replace(/^十/, '1')
          .replace(/十$/, '0')
          .replace(/廿/, '2')
          .replace(/[一二三四五六七八九]/g, v => NUMBERS[v]),
    month.includes('闰'),
  ];
}

const events = []

config.forEach(([name, birthday]) => {
  let isLunar = false;
  if (!/^\d/.test(birthday)) {
    birthday = getNumberDate(birthday);
    isLunar = true;
  } else {
    birthday = birthday.split(/\D/).map(v => +v);
    if (birthday.length < 3) {
      birthday.unshift('');
    }
  }

  let [year, month, day, isLeap] = birthday;
  if (isNaN(year) || isNaN(month) || isNaN(day)) throw new Error(`${name}的生日格式错误，请检查！`);
  for (let i = year || 1900; i < 2100; i++) {
    let date = null;
    let isBeforeDay = false; /** 是否是前一天 */
    if (isLunar) {
      let d = calendar.lunar2solar(i, month, day, isLeap);
      /** 如果米有30号，提前一天 并记录 */
      if (d === -1 && day === 30) {
        d = calendar.lunar2solar(i, month, 29, isLeap);
        isBeforeDay = true;
      }
      if (d === -1) continue;
      date = new Date(d.cYear, d.cMonth - 1, d.cDay);
    } else {

      /** 如果不是闰年，但是是2月29号，提前一天 */
      if (!(i % 4 === 0 && i % 100 !== 0 || i % 400 === 0) && month === 2 && day === 29) {
        isBeforeDay = true;
        date = new Date(i, month - 1, 29);
      } else {
        date = new Date(i, month - 1, day);
      }
    }
    let summary = '';
    let type = isLunar ? '农历' : '阳历';
    /** 无年份，直接显示生日 */
    if (!year) summary = `${type}生日 ${name}`;
    else {
      let howOld = i - year;
      if (howOld === 0) summary = `${type}诞辰 ${name}`;
      else if (howOld === 1) summary = `${type}周岁 ${name}`;
      else summary = `${type}生日 ${name}${howOld}周岁`;
    }

    /** 全天日程 事件 只用年月日，结束时间使用第二天的 */
    const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    events.push({
      start: [date.getFullYear(), date.getMonth() + 1, date.getDate()],
      end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate()],
      title: `${summary}${isBeforeDay ? ' (提前一天)' : ''}`,
    });
  }
});

fs.writeFileSync('./calendar.ics', ics.createEvents(events).value)
