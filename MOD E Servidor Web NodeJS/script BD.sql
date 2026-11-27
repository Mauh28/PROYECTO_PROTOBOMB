use tscu;

create table if not exists lecturas2 (
    id int auto_increment primary key,
    F1 float not null,
    F2 float not null,
    F3 float not null,
    F4 float not null
);

select * from lecturas2;