 const run = (req, res, next) => {
    res.status(200);
    res.setHeader('content-type', 'application/json');
    res.send({
        "custom_field": "yo this is custom implementation yo"
    });
}

exports.run = run;