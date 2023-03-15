var _checkServer = (obj) => {
    var ret = false;
    if (obj.error) {
        $('.showerror p').empty();
        $('.showerror p').append(obj.error);
        $('.loader').hide();
        $('.showerror').show();
        ret = false;
    } else if (obj.progress) {
        $('.details').hide();
        $('.loader').show();
        ret = true;
    } else {
        $('#repo-date').html(obj.human);
        $('#repo-time').html(obj.machine);
        $('.loader').hide();
        $('.details').show();
        ret = false;
    }
    return ret;
};

var checkServer = () => {
    $.getJSON('/updater/admin/inspect', null, function(obj){
        if (_checkServer(obj)) {
            pollServer();
        }
    });
    
};

var pollServer = () => {
    setTimeout(() => {
        checkServer();
    }, 3000);
};

function setListeners() {

    /*
    Return obj:
    {
        error: STR message
    }
OR
    {
        progress: NUM 1-100,
    }
OR
    {
        human: DATE,
        machine: DATE
    }
    */

    function hideAll(){
        $('.details').hide();
        $('.loader').hide();
        $('.buglist').hide();
        $('.showbug').hide();
        $('.showerror').hide();
    }

    $('#rebuild').on('click', function(event){
        var targets = $('input[type=checkbox]:checked').map(function(_, el) {
            return $(el).val();
        }).get();
        targets = targets.join(",");
        if (!targets) return;

        hideAll();

        // Need also to disable check-boxes and buttons here!
        
        $('.loader').show();
        $.getJSON(`/updater/rebuild?targets=${targets}`, null, function(obj){
            pollServer(obj);
        });
    });
    $('#refresh').on('click', function(event){
        hideAll();
        $('.loader').show();
        $.getJSON('/updater/refresh', null, function(obj){
            if (obj.error) {
                $('.showerror p').empty();
                $('.showerror p').append(obj.error);
                $('.loader').hide();
                $('.showerror').show();
            } else {
                $('#repo-date').html(obj.human);
                $('#repo-time').html(obj.machine);
                $('.loader').hide();
                $('.details').show();
            }
        });
    });
    $('#inspect').on('click', function(event){
        hideAll();
        
        // Factor this out to a separate checkServer function
        // that runs once at page load, and iteratively if
        // updates are done and no errors exist. We'll no longer
        // need the check-time button.
        
    });
    $('#bugs').on('click', function(event){
        hideAll();
        $.getJSON('/updater/admin/bugs', null, function(bugs){
            // Set a list of bug links in a target div
            // /admin/bugs should build DB if it does not exist
            // /admin/bugs should purge entries over two weeks old
            $('.buglist ul').empty();
            var uList = $('.buglist ul')
            if (bugs.length) {
                $.each(bugs, function(i) {
                    var li = $('<li/>')
                        .appendTo(uList);
                    var anchor = $('<a/>')
                        .attr('id', bugs[i][1])
                        .appendTo(li);
                    anchor.append(bugs[i][0] + " :: D" + bugs[i][1]);
                    anchor.on('click', function(event){
                        $('.buglist').hide();
                        $.getJSON('/updater/admin/bugs?id=' + bugs[i][1], function(buginfo){
                            if (buginfo.error) {
                                $('.showerror p').empty();
                                $('.showerror p').append(buginfo.error)
                                $('.showerror').show();
                            } else {
                                $('#bugtitle').empty().append(buginfo.date + " :: D" + buginfo.id)
                                $('#bugtext').empty().append(buginfo.txt);
                                $('.showbug').show();
                            }
                        });
                    });
                });
            } else {
                var li = $('<li/>')
                    .appendTo(uList);
                li.append("No bug reports available");
            }
            $('.buglist').show();
        });
    });
}
