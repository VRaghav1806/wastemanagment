def get_status(fill_level):
    if fill_level >= 80:
        return 'critical'
    elif fill_level >= 60:
        return 'warning'
    elif fill_level >= 40:
        return 'moderate'
    else:
        return 'low'
