function setListeners() {
    $('#generate').on('click', function(event){
        $('.details').hide();
        $('.loader').show();
        $.getJSON('/admin/generate', null, function(obj){
            $('#repo-date').html(obj.human)
            $('#repo-time').html(obj.machine)
            $('.loader').hide();
            $('.details').show();
        })
    });
    $('#refresh').on('click', function(event){
        $('.details').hide();
        $('.loader').show();
        $.getJSON('/refresh', null, function(obj){
            $('#repo-date').html(obj.human)
            $('#repo-time').html(obj.machine)
            $('.loader').hide();
            $('.details').show();
        })
    });
    $('#inspect').on('click', function(event){
        $('.details').hide();
        $.getJSON('/admin/inspect', null, function(obj){
            $('#repo-date').html(obj.human)
            $('#repo-time').html(obj.machine)
            $('.loader').hide();
            $('.details').show();
        })
    });
}
