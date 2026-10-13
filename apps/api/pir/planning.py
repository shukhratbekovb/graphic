from collections import deque
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
import re


class DomainError(ValueError):
    pass


def day(value):
    try:
        return date.fromisoformat(str(value))
    except (ValueError, TypeError):
        raise DomainError('Некорректная дата. Используйте ГГГГ-ММ-ДД.')


def money(value):
    try:
        n = Decimal(str(value))
        if not n.is_finite() or n < 0 or n > Decimal('9999999999999999.99') or n != n.quantize(Decimal('.01')):
            raise ValueError()
        return n
    except (ValueError, InvalidOperation, TypeError):
        raise DomainError('Сумма должна быть неотрицательной, до двух знаков после запятой.')


def workday(d, calendar):
    if d.isoformat() in calendar.get('working_days', []):
        return True
    return d.weekday() < 5 and d.isoformat() not in calendar.get('holidays', [])


def working_days(start, end, calendar):
    a, b = day(start), day(end)
    if b < a:
        raise DomainError('Окончание не может быть раньше начала.')
    if (b-a).days > 3660:
        raise DomainError('Период ограничен десятью годами в MVP.')
    return [a+timedelta(days=i) for i in range((b-a).days+1) if workday(a+timedelta(days=i), calendar)]


def add_workdays(start, offset, calendar):
    d = day(start)
    while not workday(d, calendar):
        d += timedelta(days=1)
    direction = 1 if offset >= 0 else -1
    for _ in range(abs(offset)):
        d += timedelta(days=direction)
        while not workday(d, calendar):
            d += timedelta(days=direction)
    return d.isoformat()


def calculate(data):
    if not isinstance(data, dict):
        raise DomainError('Данные графика должны быть объектом.')
    tasks = data.get('tasks', [])
    if not isinstance(tasks, list) or len(tasks) > 1000:
        raise DomainError('График должен содержать до 1000 работ.')
    cal = data.get('calendar', {})
    if not isinstance(cal, dict):
        raise DomainError('Некорректный календарь.')
    for t in tasks:
        if not isinstance(t, dict):
            raise DomainError('Некорректная строка работы.')
        for field in ['id', 'title', 'specialty', 'department', 'author']:
            if not isinstance(t.get(field), str) or len(t[field]) > (80 if field == 'id' else 300):
                raise DomainError('Проверьте текстовые поля работы: '+field)
        if not isinstance(t.get('dependencies', []), list) or any(not isinstance(link, dict) for link in t.get('dependencies', [])):
            raise DomainError('Некорректный список зависимостей.')
    start, end = day(data.get('start')), day(data.get('end'))
    days = working_days(start, end, cal)
    if not days:
        raise DomainError('В графике нет рабочих дней.')
    if not workday(start, cal) or not workday(end, cal):
        raise DomainError('Начало и окончание графика должны быть рабочими днями.')
    if start < day(cal.get('start', '1900-01-01')) or end > day(cal.get('end', '2100-01-01')):
        raise DomainError('Выбранный календарь не покрывает все даты графика.')
    money(data.get('budget', '0'))
    ids = [str(t.get('id', '')) for t in tasks]
    if len(set(ids)) != len(ids) or any(not re.fullmatch(r'[\w-]{1,80}', i) for i in ids):
        raise DomainError('Идентификаторы работ должны быть уникальными.')
    durations, positions, pred, outgoing, degree = {}, {}, {}, {}, {}
    errors = []
    total = Decimal(0)
    for t in tasks:
        i = t['id']
        a, b = day(t.get('start')), day(t.get('end'))
        if a < start or b > end:
            errors.append(f"{t.get('title', i)}: даты выходят за границы графика")
        if not t.get('title') or not t.get('specialty') or not t.get('department') or not t.get('author'):
            errors.append(f"{t.get('title', i)}: заполните название, специальность, отдел и автора")
        if not workday(a, cal) or not workday(b, cal):
            errors.append(f"{t.get('title', i)}: плановая дата попала на нерабочий день")
        dur = len(working_days(a, b, cal))
        if t.get('milestone'):
            if a != b:
                raise DomainError('Событие должно иметь одну дату.')
            dur = 0
        total += money(t.get('cost', '0'))
        durations[i] = dur
        # Boundaries count working days, excluding the current day for starts.
        pos = sum(1 for d in days if d < a)
        if t.get('milestone') and t.get('position', 'end') == 'end':
            pos += 1
        positions[i] = pos
        pred[i], outgoing[i], degree[i] = [], [], 0
    if total != money(data.get('budget', '0')):
        errors.append(f'Сумма работ {total} не совпадает с бюджетом {data.get("budget")}')
    edges = []
    for t in tasks:
        j = t['id']
        seen = set()
        for link in t.get('dependencies', []):
            i = link.get('from')
            kind = link.get('type', 'FS')
            lag = link.get('lag', 0)
            if i not in durations or i == j or i in seen or kind not in ['FS', 'SS', 'FF'] or type(lag) is not int or not 0 <= lag <= 365:
                raise DomainError('Некорректная или повторная технологическая связь.')
            seen.add(i)
            w = {'FS': durations[i]+lag, 'SS': lag, 'FF': durations[i]+lag-durations[j]}[kind]
            pred[j].append((i, w)); outgoing[i].append((j, w)); degree[j] += 1
            edges.append({'from': i, 'to': j, 'type': kind, 'lag': lag, 'weight': w})
            if positions[j] < positions[i] + w:
                errors.append(f"{t['title']}: нарушена зависимость {kind} от {i}")
    q = deque(i for i in ids if degree[i] == 0)
    order = []
    while q:
        i = q.popleft(); order.append(i)
        for j, _ in outgoing[i]:
            degree[j] -= 1
            if degree[j] == 0:
                q.append(j)
    if len(order) != len(ids):
        raise DomainError('В сетевой модели обнаружен цикл зависимостей.')
    early = {}
    for i in order:
        early[i] = max([0] + [early[j]+w for j, w in pred[i]])
    length = max([0] + [early[i]+durations[i] for i in ids])
    def backwards(finish):
        latest = {i: finish-durations[i] for i in ids}
        for i in reversed(order):
            latest[i] = min([latest[i]]+[latest[j]-w for j, w in outgoing[i]])
        return latest
    latest, deadline = backwards(length), backwards(len(days))
    nodes = {i: {'duration': durations[i], 'early': early[i], 'late': latest[i], 'float': latest[i]-early[i], 'deadline_float': deadline[i]-early[i], 'critical': latest[i] == early[i]} for i in ids}
    for e in edges:
        e['critical'] = nodes[e['from']]['critical'] and nodes[e['to']]['critical'] and early[e['to']] == early[e['from']]+e['weight']
    if not tasks:
        errors.append('Добавьте хотя бы одну работу.')
    return {'nodes': nodes, 'edges': edges, 'length': length, 'duration': len(days), 'errors': errors, 'valid': not errors}
