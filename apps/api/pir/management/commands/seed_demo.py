from copy import deepcopy
from datetime import datetime, time
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from pir.models import Profile, Project, Calendar, NetworkTemplate, Schedule, Revision, Fact, Audit
from pir.planning import add_workdays, calculate


class Command(BaseCommand):
    help = 'Create explicitly labelled local demo data. Never run against a production portfolio.'
    def add_arguments(self, parser):
        parser.add_argument('--password', required=True)
    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG: raise CommandError('Demo seeding is disabled when DEBUG=0.')
        if Schedule.objects.exists():
            self.stdout.write('Existing portfolio kept; nothing changed.'); return
        people = [('gip', 'Георгий', 'Семёнов'), ('coordinator', 'Нодира', 'Каримова'), ('technical', 'Александр', 'Петров'), ('finance', 'Дилором', 'Рахимова'), ('director', 'Рустам', 'Алимов'), ('department', 'Антон', 'Сафонов')]
        users = {}
        for r, first, last in people:
            u, created = get_user_model().objects.get_or_create(username=r, defaults={'first_name': first, 'last_name': last})
            if created: u.set_password(options['password']); u.save()
            Profile.objects.get_or_create(user=u, defaults={'role': r, 'department': 'Отдел ИССО' if r == 'department' else ''})
            users[r] = u
        cal = Calendar.objects.create(title='Учебный календарь · 2026–2027', is_demo=True, data={'start': '2026-01-01', 'end': '2027-12-31', 'holidays': [], 'working_days': [], 'source': 'Учебная пятидневка. Праздники не утверждены.'})
        specifications = [
            ('a','Исходные данные и задание','100','Служба ГИП','Г. Н. Семёнов',0,2,[]),
            ('b','Конструктивные решения моста','232','Отдел ИССО','А. В. Сафонов',2,5,[{'from':'a','type':'FS','lag':0}]),
            ('c','Проектирование подходов','062','Отдел пути','О. А. Остапенко',2,3,[{'from':'a','type':'FS','lag':0}]),
            ('d','Переустройство коммуникаций','272','Отдел ЭТО','С. Р. Фахрутдинов',7,3,[{'from':'b','type':'FS','lag':0},{'from':'c','type':'FS','lag':0}]),
            ('e','Организация строительства','064','Отдел ПОС','Д. А. Абузарова',7,2,[{'from':'b','type':'FS','lag':0}]),
            ('f','Сдача разделов ГИПу','100','Служба ГИП','Г. Н. Семёнов',9,1,[{'from':'d','type':'FS','lag':0},{'from':'e','type':'FS','lag':0}]),
            ('g','Оформление и выпуск','193','Отдел выпуска','М. С. Ким',10,2,[{'from':'f','type':'FS','lag':0}]),
        ]
        tasks = [{'id':i,'title':title,'specialty':sp,'department':dep,'author':author,'offset':offset,'duration':dur,'cost':'0','dependencies':deps,'milestone':i=='f','position':'end','recipient':'ГИП' if i=='f' else ''} for i,title,sp,dep,author,offset,dur,deps in specifications]
        NetworkTemplate.objects.create(code='DEMO-23-2', title='Мосты и путепроводы · учебная схема', data={'tasks': tasks}, is_demo=True)
        NetworkTemplate.objects.create(code='20-1 / DEMO', title='Параллельная работа специальностей · учебная', data={'tasks': [{**t, 'dependencies': [], 'offset': 0} for t in tasks[1:3]]}, is_demo=True)
        catalog = [('06-2','Новая железнодорожная линия, вторые пути'),('07-2','Гражданское здание'),('09-2','Узел, станция, отдельный парк станции'),('22-2','Сооружения водоснабжения и канализации'),('22-4','Котельные и тепловые сети'),('22-7','Производственное здание'),('23-2','Железнодорожные, автодорожные мосты и путепроводы'),('27-1','Электрификация участка железной дороги'),('27-2','Тяговая подстанция: генплан'),('27-3','Тяговая подстанция: ОРУ 110 кВ'),('27-4','Контактная сеть'),('27-5','ЛЭП до 10 кВ'),('27-6','Малые здания электрификации'),('29-1','Диспетчерская централизация'),('29-2','Магистральная кабельная связь'),('29-3','Устройства СЦБ')]
        for code,title in catalog: NetworkTemplate.objects.create(code=code,title=title,data={'tasks':[]},is_demo=False)
        projects = [Project.objects.create(code=c,title=t,gip=users['gip']) for c,t in [('3488','Транспортная развязка Кадыри — Шайхонтохур'),('4216','Модернизация станции «Янги Ташкент»'),('5102','Электрификация участка Ангрен — Пап')]]
        samples = [(0,'3488.РД.01.001','Пролётные строения','2026-09-28',320000000,'approved'),(1,'4216.РД.02.001','Путевое развитие станции','2026-10-05',245000000,'approved'),(2,'5102.РД.01.002','Контактная сеть и опоры','2026-10-12',186000000,'review'),(0,'3488.РД.02.001','Подходы к путепроводу','2026-10-19',128000000,'draft')]
        for index,(pi,num,title,start,budget,status) in enumerate(samples):
            rows = deepcopy(tasks)
            for t in rows:
                t['start'] = add_workdays(start,t.pop('offset'),cal.data)
                t['end'] = add_workdays(t['start'],max(0,t.pop('duration')-1),cal.data)
                t['cost'] = str(budget//5) if t['id'] in ['b','c','d','e','g'] else '0'
            data={'start':start,'end':max(t['end'] for t in rows),'budget':str(budget),'calendar':{**cal.data,'id':cal.pk,'title':cal.title,'is_demo':True},'model_code':'DEMO-23-2','tasks':rows}
            result=calculate(data)
            if result['errors']: raise CommandError(str(result['errors']))
            s=Schedule.objects.create(project=projects[pi],number=num,title=title,stage='РД',phase='01')
            v=Revision.objects.create(schedule=s,number=1,data=data,status=status,author=users['gip'],approver=users['technical'] if status!='draft' else None,approved_at=timezone.make_aware(datetime.combine(datetime.fromisoformat(start).date(),time(9))) if status=='approved' else None)
            Audit.objects.create(schedule=s,user=users['gip'],action='Учебный график создан',detail={'demo':True})
            if status=='approved':
                for t in rows:
                    progress = {'a':100,'b':100 if index==0 else 40,'c':100 if index==0 else 20,'d':40 if index==0 else 0,'e':70 if index==0 else 0,'f':0,'g':0}[t['id']]
                    if t['start'] > '2026-10-12': continue
                    Fact.objects.create(schedule=s,node_id=t['id'],effective_date='2026-10-12',progress=progress,actual_start=t['start'] if progress else None,actual_end=t['end'] if progress==100 else None,reason='Ожидаются уточнённые исходные данные' if index==0 and progress<100 else '',author=users['coordinator'])
        self.stdout.write(self.style.SUCCESS('Demo created: 3 projects, 4 schedules, 6 role accounts.'))
