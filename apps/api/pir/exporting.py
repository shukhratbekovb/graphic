from io import BytesIO
from datetime import date
import xlsxwriter


def workbook(rows, title='Портфель ПИР', snapshot=False):
    output = BytesIO()
    book = xlsxwriter.Workbook(output, {'in_memory': True, 'strings_to_formulas': False, 'strings_to_urls': False})
    head = book.add_format({'bold': True, 'bg_color': '#193C38', 'font_color': 'white', 'text_wrap': True, 'border': 1})
    cell = book.add_format({'border': 1, 'font_size': 9, 'text_wrap': True, 'valign': 'top'})
    num = book.add_format({'border': 1, 'num_format': '#,##0.00', 'font_size': 9})
    dt = book.add_format({'border': 1, 'num_format': 'dd.mm.yyyy', 'font_size': 9})
    big = book.add_format({'font_size': 18, 'bold': True, 'font_color': '#193C38'})
    summary = book.add_worksheet('Сводный отчёт')
    summary.merge_range('A1:H1', title, big)
    headers = ['Объект', '№ графика', 'Наименование', 'ГИП', 'Начало', 'Окончание', 'Бюджет, сум', 'Готовность, %']
    summary.write_row(2, 0, headers, head)
    summary.set_column(0, 1, 20); summary.set_column(2, 3, 35); summary.set_column(4, 7, 18)
    for r, s in enumerate(rows, 3):
        values = [s['project']['code'], s['number'], s['title'], s['gip']]
        for c, v in enumerate(values): summary.write_string(r, c, str(v), cell)
        for c, key in [(4, 'start'), (5, 'end')]: summary.write_datetime(r, c, date.fromisoformat(s['data'][key]), dt)
        summary.write_number(r, 6, float(s['data']['budget']), num); summary.write_number(r, 7, s['progress'], num)
    summary.freeze_panes(3, 2); summary.autofilter(2, 0, max(2, len(rows)+2), 7)
    summary.set_landscape(); summary.set_paper(9); summary.fit_to_pages(1, 0); summary.repeat_rows(2)
    if len(rows) == 1:
        s = rows[0]
        page = book.add_worksheet('График А4')
        page.set_landscape(); page.set_paper(9); page.set_margins(.39, .39, .39, .39)
        page.set_column(0, 0, 9); page.set_column(1, 1, 32); page.set_column(2, 3, 17); page.set_column(4, 6, 14); page.set_column(7, 7, 21)
        page.merge_range('A1:H1', 'ПИР / '+s['number'], big)
        page.merge_range('A2:H2', s['project']['code']+' · '+s['project']['title'], cell)
        page.merge_range('A3:H3', f"{s['title']} · Стадия {s['stage']} · Этап {s['phase']} · Модель {s['data'].get('model_code', 'Индивидуальная')}", cell)
        page.merge_range('A4:H4', f"ГИП: {s['gip']} · Версия {s['revision']['number']} · {s['revision']['status']} · На дату {s['as_of']}", cell)
        page.merge_range('A5:H5', f"Рабочих дней: {s['calculation']['duration']} · Бюджет: {s['data']['budget']} сум · Календарь: {s['data']['calendar'].get('title', '')}", cell)
        page.write_row(6, 0, ['Шифр', 'Работа / передача', 'Отдел', 'Автор', 'Начало', 'Окончание', 'Сумма, сум', 'Связи / получатель'], head)
        for r, task in enumerate(s['data']['tasks'], 7):
            page.set_row(r, 35)
            for c, key in [(0, 'specialty'), (1, 'title'), (2, 'department'), (3, 'author')]: page.write_string(r, c, str(task[key]), cell)
            page.write_datetime(r, 4, date.fromisoformat(task['start']), dt); page.write_datetime(r, 5, date.fromisoformat(task['end']), dt)
            if task['cost'] is not None: page.write_number(r, 6, float(task['cost']), num)
            page.write_string(r, 7, ', '.join(l['from']+' → '+task['id'] for l in task.get('dependencies', [])) + (' → '+task.get('recipient', '') if task.get('milestone') else ''), cell)
        page.repeat_rows(0, 6); page.set_footer('&LПИР Контроль — '+('сохранённый снимок' if snapshot else 'выгрузка')+'&RСтраница &P из &N')
        page.set_print_scale(85); page.print_area(0, 0, len(s['data']['tasks'])+6, 7)
        detail = book.add_worksheet('Факт и передачи')
        detail.write_row(0, 0, ['ID', 'Работа', 'Получатель', 'План', 'Факт окончания', '%', 'Причина', 'Дата состояния'], head)
        detail.set_column(0, 7, 22)
        for r, t in enumerate(s['data']['tasks'], 1):
            f = s['facts'].get(t['id'], {})
            detail.write_row(r, 0, [t['id'], t['title'], t.get('recipient', ''), t['end'], f.get('actual_end', ''), f.get('progress', ''), f.get('reason', ''), f.get('effective_date', '')], cell)
    meta = book.add_worksheet('Параметры')
    meta.write_row(0, 0, ['Параметр', 'Значение'], head); meta.set_column(0, 0, 28); meta.set_column(1, 1, 70)
    meta.write_row(1, 0, ['Дата состояния', rows[0]['as_of'] if rows else '']); meta.write_row(2, 0, ['Валюта', 'UZS, сум']); meta.write_row(3, 0, ['Источник', 'Сохранённый снимок' if snapshot else 'Данные приложения']); meta.write_row(4, 0, ['Важно', 'Условное выполнение не является оплатой или актом.'])
    book.close()
    return output.getvalue()
