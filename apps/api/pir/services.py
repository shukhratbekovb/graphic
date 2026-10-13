from copy import deepcopy
from datetime import datetime, time
from decimal import Decimal
from django.utils import timezone
from .models import Schedule, Fact, Revision
from .planning import day, working_days, calculate


def role(user):
    return user.profile.role if hasattr(user, 'profile') else 'none'


def accessible(user):
    qs = Schedule.objects.select_related('project__gip').prefetch_related('revisions', 'facts')
    r = role(user)
    if r == 'gip':
        return qs.filter(project__gip=user)
    if r == 'department':
        allowed = [s.pk for s in qs if any(t.get('department') == user.profile.department for v in s.revisions.all() for t in v.data.get('tasks', []))]
        return qs.filter(pk__in=allowed)
    return qs if r in ['coordinator', 'technical', 'finance', 'director'] else qs.none()


def cutoff(value):
    return timezone.make_aware(datetime.combine(day(value), time.max))


def observations(schedule, as_of, known_at=None):
    result = {}
    for f in sorted(schedule.facts.all(), key=lambda f: (f.effective_date, f.recorded_at, f.pk)):
        if f.effective_date <= day(as_of) and (known_at is None or f.recorded_at <= known_at):
            result[f.node_id] = {'progress': float(f.progress), 'actual_start': str(f.actual_start) if f.actual_start else None, 'actual_end': str(f.actual_end) if f.actual_end else None, 'reason': f.reason, 'effective_date': str(f.effective_date), 'recorded_at': f.recorded_at.isoformat()}
    return result


def serialize(schedule, user, as_of=None, known_at=None, historical=False, revision=None):
    as_of = as_of or timezone.localdate().isoformat()
    versions = list(schedule.revisions.all())
    approved = [v for v in versions if v.status == 'approved' and (not historical or (v.approved_at <= cutoff(as_of) and (known_at is None or v.approved_at <= known_at)))]
    selected = revision or (approved[-1] if historical and approved else (versions[-1] if not historical and versions else None))
    if selected is None or (historical and not approved):
        return None
    data = deepcopy(selected.data)
    facts = observations(schedule, as_of, known_at)
    tasks = data.get('tasks', [])
    calc = calculate(data)
    costs = [Decimal(t['cost']) for t in tasks]
    weights = costs if sum(costs) else [Decimal(max(1, calc['nodes'][t['id']]['duration'])) for t in tasks]
    weight = sum(weights)
    pct = sum(w*Decimal(str(facts.get(t['id'], {}).get('progress', 0))) for t, w in zip(tasks, weights))/weight if weight else Decimal(0)
    complete = bool(tasks) and all(facts.get(t['id'], {}).get('progress') == 100 for t in tasks)
    progress = 100 if complete else min(99.9, round(float(pct), 1))
    late = [t for t in tasks if t['end'] < as_of and facts.get(t['id'], {}).get('progress', 0) < 100]
    state = 'completed' if complete else ('overdue' if late else ('active' if any(f.get('progress', 0)>0 for f in facts.values()) else 'planned'))
    load = {}
    for t in tasks:
        k = (t['specialty'], t['department'])
        load.setdefault(k, {'specialty': t['specialty'], 'department': t['department'], 'cost': Decimal(0), 'tasks': 0})
        load[k]['cost'] += Decimal(t['cost']); load[k]['tasks'] += 1
    if role(user) == 'department':
        for t in data.get('tasks', []):
            if t['department'] != user.profile.department:
                t['cost'] = None
        load = {k: v for k, v in load.items() if v['department'] == user.profile.department}
    for item in load.values():
        item['cost'] = str(item['cost'])
    return {'id': str(schedule.pk), 'number': schedule.number, 'title': schedule.title, 'project': {'id': str(schedule.project_id), 'code': schedule.project.code, 'title': schedule.project.title}, 'stage': schedule.stage, 'phase': schedule.phase, 'gip': schedule.project.gip.get_full_name(), 'gip_id': schedule.project.gip_id, 'revision': {'id': selected.pk, 'number': selected.number, 'status': selected.status, 'edit_version': selected.edit_version, 'reason': selected.reason, 'author_id': selected.author_id, 'approver_id': selected.approver_id}, 'data': data, 'facts': facts, 'calculation': calc, 'progress': progress, 'state': state, 'overdue_count': len(late), 'incomplete_facts': sum(t['id'] not in facts for t in tasks), 'load': list(load.values()), 'as_of': as_of, 'versions': [{'id': v.pk, 'number': v.number, 'status': v.status, 'approved_at': v.approved_at.isoformat() if v.approved_at else None, 'reason': v.reason} for v in versions], 'baseline': approved[0].data if approved and role(user) != 'department' else None}
