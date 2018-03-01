function setListeners() {
    function hideAll(){
        $('.details').hide();
        $('.loader').hide();
        $('.buglist').hide();
        $('.showbug').hide();
    }
    $('#generate').on('click', function(event){
        hideAll();
        $('.loader').show();
        $.getJSON('/admin/generate', null, function(obj){
            $('#repo-date').html(obj.human)
            $('#repo-time').html(obj.machine)
            $('.loader').hide();
            $('.details').show();
        })
    });
    $('#refresh').on('click', function(event){
        hideAll();
        $('.loader').show();
        $.getJSON('/refresh', null, function(obj){
            $('#repo-date').html(obj.human)
            $('#repo-time').html(obj.machine)
            $('.loader').hide();
            $('.details').show();
        })
    });
    $('#inspect').on('click', function(event){
        hideAll();
        $.getJSON('/admin/inspect', null, function(obj){
            $('#repo-date').html(obj.human)
            $('#repo-time').html(obj.machine)
            $('.details').show();
        })
    });
    $('#bugs').on('click', function(event){
        hideAll();
        $.getJSON('/admin/bugs', null, function(bugs){
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
                        .attr('id', bugs[i])
                        .appendTo(li);
                    anchor.append(bugs[i]);
                    anchor.on('click', function(event){
                        $('.buglist').hide();
                        $.getJSON('/admin/bugs?id=' + bugs[i], function(buginfo){
                            $('#bugtitle').empty().append("D" + buginfo.id)
                            $('#bugtext').empty().append(buginfo.txt);
                            $('.showbug').show();
                        })
                    })
                });
            } else {
                var li = $('<li/>')
                    .appendTo(uList);
                li.append("No bug reports available");
            }
            $('.buglist').show();
        })
    });
}
