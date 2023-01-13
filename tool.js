function normalizeClass(arg1) {
    let res = '';
    const type = typeof arg1;
    if (type === 'string')
        return arg1 + ' ';
    if (type === 'object' && !Array.isArray(arg1)) {
        let tem = ''
        for (const key in arg1) {
            if (arg1[key]) {
                tem += key;
                tem += ' ';
            }
        }
        return tem;
    }
    if (type === 'object' && Array.isArray(arg1)) {
        arg1.forEach(item => {
            res += normalizeClass(item);
        })
    }
    // 最后的结果需要去除字符串最后的空格
    return res.trim();
}