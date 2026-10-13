from django.db import migrations


def install(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute('''
    CREATE FUNCTION pir_guard_revision() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.status IN ('approved', 'review', 'returned') THEN
        IF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'Frozen schedule revisions cannot be deleted';
        END IF;
        IF NEW.data IS DISTINCT FROM OLD.data
          OR NEW.author_id IS DISTINCT FROM OLD.author_id
          OR NEW.schedule_id IS DISTINCT FROM OLD.schedule_id
          OR NEW.number IS DISTINCT FROM OLD.number THEN
          RAISE EXCEPTION 'Frozen schedule content cannot be modified';
        END IF;
      END IF;
      IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
      RETURN NEW;
    END $$;
    CREATE TRIGGER pir_revision_immutable BEFORE UPDATE OR DELETE ON pir_revision
    FOR EACH ROW EXECUTE FUNCTION pir_guard_revision();
    ''')


def uninstall(apps, schema_editor):
    if schema_editor.connection.vendor == 'postgresql':
        schema_editor.execute('DROP TRIGGER IF EXISTS pir_revision_immutable ON pir_revision; DROP FUNCTION IF EXISTS pir_guard_revision();')


class Migration(migrations.Migration):
    dependencies = [('pir', '0001_initial')]
    operations = [migrations.RunPython(install, uninstall)]
