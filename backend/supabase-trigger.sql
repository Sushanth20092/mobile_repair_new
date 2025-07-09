-- Supabase trigger function to automatically create profile after user email confirmation
-- Run this in your Supabase SQL editor

-- Function to handle new user creation with better error handling
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Log the trigger execution
  raise log 'Trigger handle_new_user called for user: %', new.id;
  
  -- Check if user metadata exists
  if new.raw_user_meta_data is null then
    raise log 'No user metadata found for user: %', new.id;
    return new;
  end if;
  
  -- Extract metadata with defaults
  declare
    user_name text := coalesce(new.raw_user_meta_data->>'name', '');
    user_phone text := coalesce(new.raw_user_meta_data->>'phone', '');
    user_role text := coalesce(new.raw_user_meta_data->>'role', 'user');
    user_city_id uuid := null;
    user_city_id_text text;
    existing_email text;
  begin
    -- Check if email already exists in profiles table
    select email into existing_email from public.profiles where email = new.email limit 1;
    
    if existing_email is not null then
      raise log 'Email % already exists in profiles table for user: %', new.email, new.id;
      return new;
    end if;
    
    -- Try to parse city_id, but don't fail if it's invalid
    user_city_id_text := new.raw_user_meta_data->>'city_id';
    raise notice 'Raw city_id value for user %: %', new.id, user_city_id_text;
    begin
      if user_city_id_text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
        -- Try to cast to UUID and check if it exists in cities
        declare
          city_exists boolean;
        begin
          select exists(select 1 from public.cities where id = user_city_id_text::uuid) into city_exists;
          if city_exists then
            user_city_id := user_city_id_text::uuid;
          else
            raise notice 'city_id for user % is not found in cities table: %', new.id, user_city_id_text;
            user_city_id := null;
          end if;
        exception when others then
          raise notice 'city_id for user % could not be cast to UUID: %', new.id, user_city_id_text;
          user_city_id := null;
        end;
      else
        raise notice 'city_id for user % is not a valid UUID: %', new.id, user_city_id_text;
        user_city_id := null;
      end if;
    exception when others then
      raise notice 'Unexpected error handling city_id for user %: %', new.id, user_city_id_text;
      user_city_id := null;
    end;
    
    -- Insert into profiles table - MATCHING THE EXACT SCHEMA
    insert into public.profiles (
      id, name, phone, role, is_verified, city_id, is_active, created_at, updated_at, password, addresses, email
    )
    values (
      new.id,
      user_name,
      user_phone,
      user_role,
      true, -- is_verified
      user_city_id,
      true, -- is_active
      now(), -- created_at
      now(), -- updated_at
      '', -- password (empty string, not null)
      '[]'::jsonb, -- addresses
      new.email
    );
    
    raise log 'Profile created successfully for user: %', new.id;
    return new;
  exception when unique_violation then
    raise log 'Unique constraint violation for user %: %', new.id, sqlerrm;
    return new;
  when others then
    raise log 'Error creating profile for user %: %', new.id, sqlerrm;
    return new;
  end;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger to call the function after a new user is created
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user(); 